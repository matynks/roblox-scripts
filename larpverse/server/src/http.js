import fs from 'node:fs';
import path from 'node:path';

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const E = {
  bad: (message, details) => new HttpError(400, 'bad_request', message, details),
  unauthorized: (message = 'Sign in required') => new HttpError(401, 'unauthorized', message),
  forbidden: (message = 'You do not have permission to do that', code = 'forbidden') => new HttpError(403, code, message),
  notFound: (message = 'Not found') => new HttpError(404, 'not_found', message),
  conflict: (message, code = 'conflict', details) => new HttpError(409, code, message, details),
  tooMany: (message = 'Too many requests, slow down') => new HttpError(429, 'rate_limited', message),
  tooLarge: (message = 'Request body too large') => new HttpError(413, 'payload_too_large', message),
};

/** Route option: allow larger JSON bodies (image uploads as data URLs). */
export const UPLOAD = { bodyLimit: 3 * 1024 * 1024 };

/** Sentinel returned by handlers that wrote the response themselves (e.g. SSE). */
export const HANDLED = Symbol('handled');

export class Router {
  constructor() {
    this.routes = [];
  }

  on(method, pattern, ...handlers) {
    const keys = [];
    const source = pattern.replace(/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
    this.routes.push({ method, pattern, re: new RegExp(`^${source}/?$`), keys, handlers });
  }

  get(p, ...h) { this.on('GET', p, ...h); }
  post(p, ...h) { this.on('POST', p, ...h); }
  put(p, ...h) { this.on('PUT', p, ...h); }
  patch(p, ...h) { this.on('PATCH', p, ...h); }
  delete(p, ...h) { this.on('DELETE', p, ...h); }

  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}

export function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(E.tooLarge());
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/**
 * The API authenticates with bearer tokens only (no cookies), so cross-origin reads cannot
 * ride on ambient credentials. Allowing any origin lets the Android app (http://localhost
 * inside its WebView) and browsers on the LAN talk to the same server.
 */
export function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Device-Name');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Serves the built single-page app with an index.html fallback for client routes. */
export function serveStatic(req, res, staticDir, pathname) {
  if (!staticDir || !fs.existsSync(staticDir)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Larpverse server is running. Build the app (larpverse/app: npm run build) to serve the web client here.');
    return;
  }
  let rel = decodeURIComponent(pathname);
  if (rel.includes('\0')) { res.writeHead(400); res.end(); return; }
  let file = path.normalize(path.join(staticDir, rel));
  if (!file.startsWith(path.normalize(staticDir))) { res.writeHead(403); res.end(); return; }
  let stat = fs.existsSync(file) ? fs.statSync(file) : null;
  if (!stat || stat.isDirectory()) {
    file = path.join(staticDir, 'index.html');
    stat = fs.existsSync(file) ? fs.statSync(file) : null;
    if (!stat) { res.writeHead(404); res.end('Not found'); return; }
  }
  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  if (ext === '.html') headers['Content-Security-Policy'] = APP_CSP;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}
