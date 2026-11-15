import crypto from 'node:crypto';

export const now = () => Date.now();

export function parseJson(text, fallback) {
  if (text == null || text === '') return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

export const toJson = (v) => JSON.stringify(v ?? null);

/** Strip control characters (except newline/tab) and trim. */
export function cleanText(s) {
  return String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').trim();
}

export function randomCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** Deterministic PRNG for seeding (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paginate(query, { defaultLimit = 30, maxLimit = 100 } = {}) {
  const limit = clamp(parseInt(query.limit ?? defaultLimit, 10) || defaultLimit, 1, maxLimit);
  const offset = Math.max(0, parseInt(query.offset ?? 0, 10) || 0);
  return { limit, offset };
}

export function page(rows, limit, offset) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextOffset: hasMore ? offset + limit : null };
}

export const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_]{1,18}[A-Za-z0-9]$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
