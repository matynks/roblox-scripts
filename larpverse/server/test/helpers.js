import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { startServer } from '../src/server.js';
import { totp } from '../src/security.js';

export const OWNER_PASSWORD = 'OwnerPass123';

export async function boot(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'larpverse-test-'));
  const cfg = loadConfig({
    dataDir: dir,
    dbFile: path.join(dir, 'test.db'),
    uploadsDir: path.join(dir, 'uploads'),
    backupsDir: path.join(dir, 'backups'),
    port: 0,
    host: '127.0.0.1',
    ownerUsername: 'owner',
    ownerPassword: OWNER_PASSWORD,
    seedDemo: true,
    rateLimits: null,
    quiet: true,
    staticDir: null,
    ...overrides,
  });
  const srv = await startServer(cfg);
  const base = `http://127.0.0.1:${srv.port}`;
  return {
    base,
    srv,
    dir,
    client: () => new Client(base),
    async close() {
      await srv.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export class Client {
  constructor(base) {
    this.base = base;
    this.token = null;
    this.me = null;
  }

  async req(method, url, body) {
    const headers = {};
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(this.base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: res.status, body: json };
  }

  get(u) { return this.req('GET', u); }
  post(u, b = {}) { return this.req('POST', u, b); }
  patch(u, b = {}) { return this.req('PATCH', u, b); }
  put(u, b = {}) { return this.req('PUT', u, b); }
  del(u) { return this.req('DELETE', u); }

  /** Like req but throws unless the status is 2xx; returns the body. */
  async ok(method, url, body) {
    const r = await this.req(method, url, body);
    if (r.status < 200 || r.status > 299) throw new Error(`${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }

  async register(username, password = 'Password123', displayName) {
    const r = await this.post('/api/auth/register', { username, password, displayName });
    if (r.status !== 201) throw new Error(`register ${username} → ${r.status} ${JSON.stringify(r.body)}`);
    this.token = r.body.token;
    this.me = r.body.me;
    return r.body;
  }

  async login(username, password) {
    const r = await this.post('/api/auth/login', { username, password });
    if (r.status !== 200) throw new Error(`login ${username} → ${r.status} ${JSON.stringify(r.body)}`);
    this.token = r.body.token;
    this.me = r.body.me;
    return r.body;
  }

  async loginOwner({ elevate = true } = {}) {
    await this.login('owner', OWNER_PASSWORD);
    if (elevate) await this.ok('POST', '/api/security/elevate', { password: OWNER_PASSWORD });
    return this;
  }

  /** Opens the SSE stream; returns { messages, waitFor(pred), close() }. */
  async stream(url) {
    const controller = new AbortController();
    const res = await fetch(this.base + url, { headers: { authorization: `Bearer ${this.token}` }, signal: controller.signal });
    if (res.status !== 200) throw new Error(`stream ${url} → ${res.status} ${await res.text()}`);
    const messages = [];
    const waiters = [];
    const decoder = new TextDecoder();
    let buf = '';
    (async () => {
      try {
        for await (const chunk of res.body) {
          buf += decoder.decode(chunk, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const data = block.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
            if (!data) continue;
            const msg = JSON.parse(data);
            messages.push(msg);
            for (const w of [...waiters]) if (w.pred(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
          }
        }
      } catch { /* aborted */ }
    })();
    return {
      messages,
      waitFor(pred, timeout = 4000) {
        const found = messages.find(pred);
        if (found) return Promise.resolve(found);
        return new Promise((resolve, reject) => {
          const w = { pred, resolve };
          waiters.push(w);
          setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); reject(new Error('timed out waiting for stream message')); } }, timeout);
        });
      },
      close() { controller.abort(); },
    };
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { totp };

// 1×1 PNG
export const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
