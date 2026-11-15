/** A user-presentable error with a stable machine code. */
export class AppError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = retryable;
  }
}

const FRIENDLY: Record<string, string> = {
  NOT_AUTHENTICATED: 'Your session ended. Please sign in again.',
  ACCOUNT_SUSPENDED: 'This account is suspended.',
  PROFILE_NOT_FOUND: 'Your player profile could not be found.',
  INSUFFICIENT_FUNDS: "You don't have enough Orbs.",
  ALREADY_OWNED: 'You already own this.',
  SOLD_OUT: 'This limited item is sold out.',
  NOT_FOR_SALE: 'This item is not for sale.',
  OFF_SEASON: 'This seasonal item is not available right now.',
  PRICE_CHANGED: 'The price changed. Please review and try again.',
  COPY_LIMIT: 'You can own up to 3 copies of a limited item.',
  ITEM_NOT_FOUND: 'This item no longer exists.',
  NOT_OWNED: 'You can only wear items you own.',
  RATE_LIMITED: 'You are doing that too often. Please wait a moment.',
  FORBIDDEN: 'You do not have access to this.',
  USERNAME_TAKEN: 'That username is already taken.',
  INVALID_USERNAME: 'Usernames are 3–20 letters, numbers and at most one underscore.',
  ALREADY_CLAIMED: 'Already claimed. Come back tomorrow!',
  USER_UNAVAILABLE: 'You cannot interact with this player.',
  NETWORK: 'No connection. Check your internet and try again.',
  OFFLINE_ONLY: 'This needs an online account.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address first.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  WEAK_PASSWORD: 'Choose a stronger password (8+ characters with letters and numbers).',
  INVALID_CODE: 'That code is invalid or expired.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export function friendlyMessage(code: string, fallback?: string | null): string {
  return fallback && fallback !== code ? fallback : FRIENDLY[code] ?? FRIENDLY.UNKNOWN;
}

/** Normalises Supabase/PostgREST/GoTrue/network errors into AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const anyErr = e as any;
  const message: string = anyErr?.message ?? String(e);
  const hint: string | undefined = anyErr?.hint ?? undefined;
  // Our SQL functions raise MESSAGE = CODE (uppercase snake), HINT = human text
  if (/^[A-Z][A-Z_]{2,40}$/.test(message)) {
    return new AppError(message, friendlyMessage(message, hint), message === 'RATE_LIMITED');
  }
  const lower = message.toLowerCase();
  if (lower.includes('network request failed') || lower.includes('failed to fetch') || lower.includes('fetch failed') || lower.includes('networkerror')) {
    return new AppError('NETWORK', FRIENDLY.NETWORK, true);
  }
  if (lower.includes('invalid login credentials')) return new AppError('INVALID_CREDENTIALS', FRIENDLY.INVALID_CREDENTIALS);
  if (lower.includes('email not confirmed')) return new AppError('EMAIL_NOT_CONFIRMED', FRIENDLY.EMAIL_NOT_CONFIRMED);
  if (lower.includes('already registered') || lower.includes('already been registered')) return new AppError('EMAIL_TAKEN', FRIENDLY.EMAIL_TAKEN);
  if (lower.includes('password') && (lower.includes('weak') || lower.includes('at least') || lower.includes('should contain'))) {
    return new AppError('WEAK_PASSWORD', FRIENDLY.WEAK_PASSWORD);
  }
  if (lower.includes('token has expired') || lower.includes('otp') || lower.includes('invalid token')) return new AppError('INVALID_CODE', FRIENDLY.INVALID_CODE);
  if (lower.includes('database error saving new user')) {
    // The sign-up trigger rejected the profile; the form pre-checks, so this is a race on the username.
    return new AppError('USERNAME_TAKEN', 'That username was just taken. Please choose another.');
  }
  if (lower.includes('jwt') || lower.includes('refresh token')) return new AppError('NOT_AUTHENTICATED', FRIENDLY.NOT_AUTHENTICATED);
  if (anyErr?.status === 429 || lower.includes('rate limit')) return new AppError('RATE_LIMITED', FRIENDLY.RATE_LIMITED, true);
  return new AppError('UNKNOWN', FRIENDLY.UNKNOWN, true);
}
