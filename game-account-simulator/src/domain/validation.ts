/** Client-side validation. The server re-validates everything; these exist for instant feedback. */

export type ValidationResult = { ok: true } | { ok: false; message: string };

const ok: ValidationResult = { ok: true };
const fail = (message: string): ValidationResult => ({ ok: false, message });

export function validateUsername(raw: string): ValidationResult {
  const v = raw.trim();
  if (v.length < 3 || v.length > 20) return fail('Usernames are 3–20 characters.');
  if (!/^[A-Za-z0-9_]+$/.test(v)) return fail('Use only letters, numbers and one underscore.');
  if (v.startsWith('_') || v.endsWith('_')) return fail('Usernames cannot start or end with an underscore.');
  if ((v.match(/_/g) ?? []).length > 1) return fail('Usernames can contain at most one underscore.');
  return ok;
}

export function validateDisplayName(raw: string): ValidationResult {
  const v = raw.trim();
  if (v.length < 3 || v.length > 20) return fail('Display names are 3–20 characters.');
  if (!/^[A-Za-z0-9_][A-Za-z0-9_ ]*[A-Za-z0-9_]$/.test(v)) return fail('Use letters, numbers, spaces or underscores.');
  if (v.includes('  ')) return fail('Display names cannot contain double spaces.');
  return ok;
}

export function validateEmail(raw: string): ValidationResult {
  const v = raw.trim();
  if (!v) return fail('Enter your email address.');
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return fail('Enter a valid email address.');
  return ok;
}

export function validatePassword(raw: string): ValidationResult {
  if (raw.length < 8) return fail('Passwords need at least 8 characters.');
  if (raw.length > 72) return fail('Passwords can be at most 72 characters.');
  if (!/[A-Za-z]/.test(raw) || !/[0-9]/.test(raw)) return fail('Use at least one letter and one number.');
  return ok;
}

export function passwordStrength(raw: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (raw.length >= 8) s++;
  if (raw.length >= 12) s++;
  if (/[A-Z]/.test(raw) && /[a-z]/.test(raw)) s++;
  if (/[0-9]/.test(raw) && /[^A-Za-z0-9]/.test(raw)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

export function validateReason(raw: string): ValidationResult {
  const v = raw.trim();
  if (v.length < 3) return fail('Enter a reason (at least 3 characters).');
  if (v.length > 200) return fail('Reasons can be at most 200 characters.');
  return ok;
}
