import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { app } from './app.js';
import { authenticate } from './auth.js';
import { Db } from './db.js';
import { clientIp, E, HANDLED, HttpError, readBody, Router, sendJson, serveStatic, setCors, setSecurityHeaders } from './http.js';
import { migrate } from './migrate.js';
import { seedRolePermissions } from './permissions.js';
import { RateLimiter } from './ratelimit.js';
import { serveFile } from './services/files.js';
import { startJobWorker } from './services/jobs.js';
import { GameEngine } from './game/engine.js';
import { bootstrapOwner, seedDemo, seedEssentials } from './seed/seed.js';

import registerAuth from './routes/auth.js';
import registerAccounts from './routes/accounts.js';
import registerSocial from './routes/social.js';
import registerWallet from './routes/wallet.js';
import registerCatalog from './routes/catalog.js';
import registerInventory from './routes/inventory.js';
import registerAvatar from './routes/avatar.js';
import registerGroups from './routes/groups.js';
import registerNotifications from './routes/notifications.js';
import registerExperiences from './routes/experiences.js';
import registerHome from './routes/home.js';
import registerGame from './routes/game.js';
import registerAdmin from './routes/admin.js';
import registerAdminContent from './routes/admin-content.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function buildRouter() {
  const r = new Router();
  r.get('/api/health', () => ({ ok: true, name: 'Larpverse', time: Date.now() }));
  for (const register of [registerAuth, registerAccounts, registerSocial, registerWallet, registerCatalog, registerInventory,
    registerAvatar, registerGroups, registerNotifications, registerExperiences, registerHome, registerGame, registerAdmin, registerAdminContent]) {
    register(r);
  }
  return r;
}

export async function startServer(cfg) {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  fs.mkdirSync(cfg.uploadsDir, { recursive: true });
  const db = new Db(cfg.dbFile);
  app.db = db;
  app.cfg = cfg;
  if (cfg.quiet) app.log = () => {};

  migrate(db, { migrationsDir: cfg.migrationsDir, backupsDir: cfg.backupsDir, log: app.log });
  db.tx(() => seedRolePermissions(db));
  await seedEssentials();
  const owner = await bootstrapOwner(cfg);
  if (cfg.seedDemo) await seedDemo(owner);

  const limiter = new RateLimiter();
  const game = new GameEngine();
  app.game = game;
  game.restore();
  const stopJobs = startJobWorker();
  const router = buildRouter();

  const server = http.createServer((req, res) => {
    handle(req, res, router, limiter).catch((e) => {
      app.log('unhandled', e);
      if (!res.headersSent) sendJson(res, 500, { error: { code: 'internal', message: 'Something went wrong' } });
    });
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;

  await new Promise((resolve) => server.listen(cfg.port, cfg.host, resolve));
  const port = server.address().port;
  app.log(`listening on http://${cfg.host}:${port}`);

  return {
    server,
    port,
    owner,
    async close() {
      game.stop();
      stopJobs();
      limiter.stop();
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}

async function handle(req, res, router, limiter) {
  setSecurityHeaders(res);
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname.startsWith('/files/')) {
    serveFile(req, res, pathname.slice('/files/'.length));
    return;
  }
  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    serveStatic(req, res, app.cfg.staticDir, pathname);
    return;
  }

  setCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const ip = clientIp(req, app.cfg.trustProxy);
  const ctx = { req, res, method: req.method, path: pathname, query: Object.fromEntries(url.searchParams), ip, body: {}, status: 200 };
  const started = Date.now();
  try {
    const rl = app.cfg.rateLimits;
    const isInput = pathname.endsWith('/input');
    if (rl && isInput) limiter.enforce(`input:${ip}`, 2400, 60_000);
    else if (rl) limiter.enforce(`api:${ip}`, rl.api.limit, rl.api.windowMs);
    const m = router.match(req.method, pathname);
    if (!m) throw E.notFound('No such endpoint');
    if (m.methodNotAllowed) throw new HttpError(405, 'method_not_allowed', 'Method not allowed');
    ctx.params = m.params;
    const options = m.route.handlers.filter((h) => typeof h !== 'function');
    const handlers = m.route.handlers.filter((h) => typeof h === 'function');
    const bodyLimit = options.find((o) => o.bodyLimit)?.bodyLimit ?? 256 * 1024;

    if (WRITE_METHODS.has(req.method)) {
      if (rl && !isInput) limiter.enforce(`write:${ip}`, rl.write.limit, rl.write.windowMs);
      const raw = await readBody(req, bodyLimit);
      if (raw.length) {
        const type = req.headers['content-type'] ?? '';
        if (!type.includes('application/json')) throw new HttpError(415, 'unsupported_media_type', 'Send JSON');
        try { ctx.body = JSON.parse(raw.toString('utf8')); } catch { throw E.bad('Malformed JSON body'); }
        if (ctx.body === null || typeof ctx.body !== 'object') throw E.bad('JSON body must be an object');
      }
    }
    ctx.limiter = limiter;
    authenticate(ctx);

    let result;
    for (const h of handlers) {
      result = await h(ctx);
    }
    if (result === HANDLED) return;
    sendJson(res, ctx.status, result === undefined ? { ok: true } : result);
  } catch (e) {
    if (e instanceof HttpError) {
      sendJson(res, e.status, { error: { code: e.code, message: e.message, details: e.details ?? null } });
    } else if (e?.code === 'ERR_SQLITE_ERROR' && /constraint/i.test(e.message)) {
      sendJson(res, 409, { error: { code: 'constraint', message: friendlyConstraint(e.message) } });
    } else {
      app.log('error', req.method, pathname, e);
      if (!res.headersSent) sendJson(res, 500, { error: { code: 'internal', message: 'Something went wrong' } });
    }
  } finally {
    if (app.cfg.logRequests) app.log(req.method, pathname, res.statusCode, `${Date.now() - started}ms`);
  }
}

function friendlyConstraint(msg) {
  if (/UNIQUE/i.test(msg)) return 'That already exists';
  if (/balance/i.test(msg)) return 'Not enough Sparks';
  if (/FOREIGN KEY/i.test(msg)) return 'A referenced record does not exist';
  return 'The request conflicts with existing data';
}

export function serverRoot() {
  return path.resolve(import.meta.dirname, '..');
}
