import { HttpError } from './http.js';
import { cleanText, COLOR_RE } from './util.js';

/**
 * Minimal composable validators. Each validator is (value, path) => cleanedValue and throws
 * ValidationError. Builders: .optional(), .nullable(), .default(v).
 */
class ValidationError extends Error {
  constructor(path, message) {
    super(`${path || 'value'}: ${message}`);
    this.path = path;
  }
}

function make(fn) {
  const v = (value, path = '') => fn(value, path);
  v.optional = () => make((value, path) => (value === undefined ? undefined : fn(value, path)));
  v.nullable = () => make((value, path) => (value === null ? null : fn(value, path)));
  v.default = (d) => make((value, path) => (value === undefined ? (typeof d === 'function' ? d() : d) : fn(value, path)));
  return v;
}

export const v = {
  string({ min = 0, max = 500, pattern, trim = true, multiline = false, message } = {}) {
    return make((value, path) => {
      if (typeof value !== 'string') throw new ValidationError(path, 'must be text');
      let s = trim ? cleanText(value) : value;
      if (!multiline) s = s.replace(/[\r\n\t]+/g, ' ');
      if (s.length < min) throw new ValidationError(path, min === 1 ? 'is required' : `must be at least ${min} characters`);
      if (s.length > max) throw new ValidationError(path, `must be at most ${max} characters`);
      if (pattern && !pattern.test(s)) throw new ValidationError(path, message ?? 'has an invalid format');
      return s;
    });
  },
  int({ min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
    return make((value, path) => {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isInteger(n)) throw new ValidationError(path, 'must be a whole number');
      if (n < min) throw new ValidationError(path, `must be at least ${min}`);
      if (n > max) throw new ValidationError(path, `must be at most ${max}`);
      return n;
    });
  },
  number({ min = -Infinity, max = Infinity } = {}) {
    return make((value, path) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(path, 'must be a number');
      if (value < min || value > max) throw new ValidationError(path, `must be between ${min} and ${max}`);
      return value;
    });
  },
  bool() {
    return make((value, path) => {
      if (typeof value !== 'boolean') throw new ValidationError(path, 'must be true or false');
      return value;
    });
  },
  enum(values) {
    return make((value, path) => {
      if (!values.includes(value)) throw new ValidationError(path, `must be one of: ${values.join(', ')}`);
      return value;
    });
  },
  color() {
    return make((value, path) => {
      if (typeof value !== 'string' || !COLOR_RE.test(value)) throw new ValidationError(path, 'must be a #rrggbb color');
      return value.toLowerCase();
    });
  },
  array(item, { min = 0, max = 200 } = {}) {
    return make((value, path) => {
      if (!Array.isArray(value)) throw new ValidationError(path, 'must be a list');
      if (value.length < min) throw new ValidationError(path, `needs at least ${min} entries`);
      if (value.length > max) throw new ValidationError(path, `allows at most ${max} entries`);
      return value.map((x, i) => item(x, `${path}[${i}]`));
    });
  },
  object(shape, { strict = false } = {}) {
    return make((value, path) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(path, 'must be an object');
      const out = {};
      for (const [k, fn] of Object.entries(shape)) {
        const r = fn(value[k], path ? `${path}.${k}` : k);
        if (r !== undefined) out[k] = r;
      }
      if (strict) {
        for (const k of Object.keys(value)) if (!(k in shape)) throw new ValidationError(path ? `${path}.${k}` : k, 'is not allowed');
      }
      return out;
    });
  },
  /** Free-form JSON object, bounded by serialized size. */
  json({ maxBytes = 20000 } = {}) {
    return make((value, path) => {
      if (value === null || typeof value !== 'object') throw new ValidationError(path, 'must be an object');
      const size = Buffer.byteLength(JSON.stringify(value));
      if (size > maxBytes) throw new ValidationError(path, `is too large (max ${maxBytes} bytes)`);
      return value;
    });
  },
  any() {
    return make((value) => value);
  },
};

export function check(schema, value) {
  try {
    return schema(value ?? {}, '');
  } catch (e) {
    if (e instanceof ValidationError) throw new HttpError(400, 'validation_failed', e.message, { field: e.path });
    throw e;
  }
}
