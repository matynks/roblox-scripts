/**
 * Converts Supabase/PostgREST/Auth/network errors into AppError with a stable
 * code and a message suitable for showing to the player.
 */

export type AppErrorCode =
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'NOT_AUTHENTICATED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_FUNDS'
  | 'ALREADY_OWNED'
  | 'NOT_OWNED'
  | 'LISTING_NOT_FOUND'
  | 'PASS_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'DAILY_ALREADY_CLAIMED'
  | 'EXPERIENCE_NOT_FOUND'
  | 'EXPERIENCE_NOT_PLAYABLE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_CLOSED'
  | 'INVALID_RESULT'
  | 'INVALID_USERNAME'
  | 'USERNAME_TAKEN'
  | 'INVALID_DISPLAY_NAME'
  | 'INVALID_BIO'
  | 'INVALID_ACCENT'
  | 'INVALID_AVATAR'
  | 'INVALID_AMOUNT'
  | 'INVALID_VALUE'
  | 'BALANCE_LIMIT'
  | 'CANNOT_FOLLOW_SELF'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'EMAIL_NOT_CONFIRMED'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMITED'
  | 'SIGNUPS_DISABLED'
  | 'UNKNOWN';

const MESSAGES: Record<AppErrorCode, string> = {
  NETWORK: "You're offline or the server can't be reached. Check your connection and try again.",
  NOT_CONFIGURED: 'BloxyBox is not connected to a server yet.',
  NOT_AUTHENTICATED: 'Your session has ended. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  INSUFFICIENT_FUNDS: "You don't have enough BoxCoins for that.",
  ALREADY_OWNED: 'You already own this.',
  NOT_OWNED: "You don't own this item.",
  LISTING_NOT_FOUND: 'This item is no longer for sale.',
  PASS_NOT_FOUND: 'This Game Pass is no longer available.',
  ITEM_NOT_FOUND: 'That item does not exist.',
  USER_NOT_FOUND: 'That player could not be found.',
  DAILY_ALREADY_CLAIMED: "You've already claimed today's reward. Come back tomorrow!",
  EXPERIENCE_NOT_FOUND: 'That experience could not be found.',
  EXPERIENCE_NOT_PLAYABLE: 'This experience is still in development.',
  SESSION_NOT_FOUND: 'This run could not be found.',
  SESSION_CLOSED: 'This run has already been submitted.',
  INVALID_RESULT: 'The game result was not valid.',
  INVALID_USERNAME: 'Usernames are 3–20 characters: lowercase letters, numbers and underscores.',
  USERNAME_TAKEN: 'That username is already taken.',
  INVALID_DISPLAY_NAME: 'Display names must be 1–30 characters.',
  INVALID_BIO: 'Your bio can be at most 200 characters.',
  INVALID_ACCENT: 'Pick one of the available accent colours.',
  INVALID_AVATAR: 'That avatar option is not available.',
  INVALID_AMOUNT: 'That amount is not valid.',
  INVALID_VALUE: 'That value is not valid.',
  BALANCE_LIMIT: 'That would exceed the maximum balance.',
  CANNOT_FOLLOW_SELF: "You can't follow yourself.",
  INVALID_CREDENTIALS: 'Wrong email or password.',
  EMAIL_TAKEN: 'An account with this email already exists. Try signing in.',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address first. Check your inbox for the link.',
  WEAK_PASSWORD: 'Choose a stronger password (at least 8 characters).',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  SIGNUPS_DISABLED: 'New sign-ups are currently disabled on this server.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly detail: Record<string, unknown> | null;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, options: { message?: string; detail?: Record<string, unknown> | null; cause?: unknown } = {}) {
    super(options.message ?? MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.detail = options.detail ?? null;
    this.cause = options.cause;
  }
}

export function messageFor(code: AppErrorCode): string {
  return MESSAGES[code];
}

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  status?: unknown;
  name?: unknown;
};

const KNOWN_CODES = new Set<string>(Object.keys(MESSAGES));

function parseDetail(details: unknown): Record<string, unknown> | null {
  if (typeof details !== 'string' || details.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(details);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const AUTH_CODE_MAP: Record<string, AppErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  user_already_exists: 'EMAIL_TAKEN',
  email_exists: 'EMAIL_TAKEN',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  weak_password: 'WEAK_PASSWORD',
  over_request_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'RATE_LIMITED',
  signup_disabled: 'SIGNUPS_DISABLED',
  session_not_found: 'NOT_AUTHENTICATED',
  refresh_token_not_found: 'NOT_AUTHENTICATED',
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const e = (error ?? {}) as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';

  // Our own RPC errors carry the code in the message (e.g. "INSUFFICIENT_FUNDS").
  if (KNOWN_CODES.has(message)) {
    return new AppError(message as AppErrorCode, { detail: parseDetail(e.details), cause: error });
  }

  if (AUTH_CODE_MAP[code]) {
    return new AppError(AUTH_CODE_MAP[code], { cause: error });
  }

  if (code === '42501' || /permission denied/i.test(message)) {
    return new AppError('FORBIDDEN', { cause: error });
  }

  if (code === 'PGRST301' || code === 'PGRST303' || /JWT expired|invalid JWT/i.test(message)) {
    return new AppError('NOT_AUTHENTICATED', { cause: error });
  }

  if (
    /network request failed|failed to fetch|network error|timed? ?out|fetch failed|load failed/i.test(message) ||
    e.name === 'AuthRetryableFetchError' ||
    (typeof e.status === 'number' && e.status === 0)
  ) {
    return new AppError('NETWORK', { cause: error });
  }

  if (/rate limit/i.test(message) || e.status === 429) {
    return new AppError('RATE_LIMITED', { cause: error });
  }

  if (/invalid login credentials/i.test(message)) {
    return new AppError('INVALID_CREDENTIALS', { cause: error });
  }
  if (/already registered/i.test(message)) {
    return new AppError('EMAIL_TAKEN', { cause: error });
  }

  return new AppError('UNKNOWN', { cause: error });
}

export function isNetworkError(error: unknown): boolean {
  return toAppError(error).code === 'NETWORK';
}
