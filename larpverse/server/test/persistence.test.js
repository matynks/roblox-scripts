import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';
import { startServer } from '../src/server.js';
import { Client, OWNER_PASSWORD } from './helpers.js';

function cfgFor(dir, migrationsDir) {
  return loadConfig({
    dataDir: dir, dbFile: path.join(dir, 'db.sqlite'), uploadsDir: path.join(dir, 'uploads'), backupsDir: path.join(dir, 'backups'),
    migrationsDir, port: 0, host: '127.0.0.1', ownerPassword: OWNER_PASSWORD, seedDemo: true, rateLimits: null, quiet: true, staticDir: null,
  });
}

test('data persists across restarts and new migrations back up the database first', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'larpverse-persist-'));
  const migrations = fs.mkdtempSync(path.join(os.tmpdir(), 'larpverse-mig-'));
  const original = path.resolve(import.meta.dirname, '../migrations');
  for (const f of fs.readdirSync(original)) fs.copyFileSync(path.join(original, f), path.join(migrations, f));
  try {
    let srv = await startServer(cfgFor(dir, migrations));
    let c = new Client(`http://127.0.0.1:${srv.port}`);
    await c.register('persisty', 'Password123');
    const item = (await c.ok('GET', '/api/catalog/items?category=hats&hideOwned=1&minPrice=1&sort=price_asc&limit=1')).items[0];
    await c.ok('POST', `/api/catalog/items/${item.id}/purchase`, { expectedPrice: item.price });
    await c.ok('POST', '/api/avatar/equip', { itemId: item.id });
    const token = c.token;
    const accounts = (await new Client(c.base).loginOwner().then((o) => o.ok('GET', '/api/admin/overview'))).counts.accounts;
    await srv.close();

    fs.writeFileSync(path.join(migrations, '002_test_extra.sql'), 'ALTER TABLE profiles ADD COLUMN pronouns TEXT;');
    srv = await startServer(cfgFor(dir, migrations));
    c = new Client(`http://127.0.0.1:${srv.port}`);
    c.token = token;
    const me = await c.ok('GET', '/api/me');
    assert.equal(me.account.username, 'persisty', 'session token survives a restart');
    assert.equal(me.wallet.balance, 500 - item.price);
    assert.ok((await c.ok('GET', '/api/avatar')).equipped.some((e) => e.itemId === item.id));
    const o = await new Client(c.base).loginOwner();
    assert.equal((await o.ok('GET', '/api/admin/overview')).counts.accounts, accounts, 'demo seed not duplicated');
    const backups = fs.readdirSync(path.join(dir, 'backups'));
    assert.equal(backups.length, 1);
    assert.match(backups[0], /before-2\.db$/);
    await srv.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(migrations, { recursive: true, force: true });
  }
});
