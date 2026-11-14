export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SignUpInput = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  displayName: string;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  const value = normaliseUsername(username);
  if (!value) return 'Choose a username.';
  if (!USERNAME_PATTERN.test(value)) return '3–20 characters: lowercase letters, numbers and underscores.';
  return undefined;
}

export function validateDisplayName(displayName: string): string | undefined {
  const value = displayName.trim();
  if (!value) return 'Enter a display name.';
  if (value.length > 30) return 'Display names can be at most 30 characters.';
  return undefined;
}

export function validateSignUp(input: SignUpInput): FieldErrors<SignUpInput> {
  const errors: FieldErrors<SignUpInput> = {};
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  const username = validateUsername(input.username);
  if (username) errors.username = username;
  const displayName = validateDisplayName(input.displayName);
  if (displayName) errors.displayName = displayName;
  const password = validatePassword(input.password);
  if (password) errors.password = password;
  if (!errors.password && input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

export function validateSignIn(email: string, password: string): FieldErrors<{ email: string; password: string }> {
  const errors: FieldErrors<{ email: string; password: string }> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Enter your password.';
  return errors;
}
