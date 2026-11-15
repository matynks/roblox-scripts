import { app } from '../app.js';
import { audit } from '../audit.js';
import { E, UPLOAD } from '../http.js';
import { ALL_PERMISSIONS, PERMISSIONS, STAFF_RANK } from '../permissions.js';
import { hashPassword, passwordProblem } from '../security.js';
import { createAccount, requireAccount } from '../services/accounts.js';
import { SLOTS } from '../services/avatar.js';
import { syncSystemBadges } from '../services/badges.js';
import { getConfig, setConfig } from '../services/config.js';
import { EVENT_TYPES, eventView, runEvent } from '../services/events.js';
import { fileUrl, saveDataUrl } from '../services/files.js';
import { itemView } from '../services/inventory.js';
import { notify, NOTIFICATION_TYPES, schedule } from '../services/notify.js';
import { applyPreset, PRESET_KINDS, presetDataSchema, presetView, snapshotAccount } from '../services/presets.js';
import { now, page, paginate, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';
import { A } from './admin.js';
import { experienceViews, GENRES } from './experiences.js';
import { settingsSchema } from './game.js';

const CATEGORIES = ['hat', 'hair', 'face', 'accessory', 'shirt', 'pants', 'bundle', 'animation', 'emote', 'collectible', 'special'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const itemSchema = (create) => {
  const req = (x) => (create ? x : x.optional());
  return v.object({
    sku: v.string({ min: 2, max: 60, pattern: /^[a-z0-9-]+$/, message: 'use lowercase letters, numbers and -' }).optional(),
    name: req(v.string({ min: 1, max: 60 })),
    description: v.string({ max: 600, multiline: true }).optional(),
    category: req(v.enum(CATEGORIES)),
    slot: req(v.enum([...SLOTS, 'bundle', 'none'])),
    asset: v.object({ style: v.string({ max: 30 }), colors: v.array(v.color(), { max: 4 }).default([]), glow: v.bool().optional(), pattern: v.string({ max: 20 }).optional() }).optional(),
    price: req(v.int({ min: 0, max: 1_000_000_000 })),
    rarity: v.enum(RARITIES).optional(),
    isLimited: v.bool().optional(),
    stock: v.int({ min: 0, max: 10_000_000 }).nullable().optional(),
    onSale: v.bool().optional(),
    isFeatured: v.bool().optional(),
    isArchived: v.bool().optional(),
    creatorAccountId: v.int({ min: 1 }).nullable().optional(),
    tags: v.array(v.string({ max: 24 }), { max: 12 }).optional(),
    bundleItemIds: v.array(v.int({ min: 1 }), { max: 20 }).optional(),
  }, { strict: true });
};

const experienceSchema = (create) => {
  const req = (x) => (create ? x : x.optional());
  return v.object({
    name: req(v.string({ min: 1, max: 60 })),
    description: v.string({ max: 2000, multiline: true }).optional(),
    genre: req(v.enum(GENRES)),
    art: v.object({ palette: v.array(v.color(), { min: 2, max: 3 }), motif: v.string({ max: 20 }), tagline: v.string({ max: 40 }).optional() }).optional(),
    engine: v.enum(['larp', 'showcase']).optional(),
    defaultScenarioId: v.int({ min: 1 }).nullable().optional(),
    maxPlayers: v.int({ min: 1, max: 50 }).optional(),
    isFeatured: v.bool().optional(),
    status: v.enum(['public', 'private', 'archived']).optional(),
    visits: v.int({ min: 0, max: 1e12 }).optional(),
    likes: v.int({ min: 0, max: 1e10 }).optional(),
    dislikes: v.int({ min: 0, max: 1e10 }).optional(),
    favoritesOverride: v.int({ min: 0, max: 1e10 }).nullable().optional(),
    activeOverride: v.int({ min: 0, max: 1e8 }).nullable().optional(),
    creatorAccountId: v.int({ min: 1 }).nullable().optional(),
    creatorGroupId: v.int({ min: 1 }).nullable().optional(),
  }, { strict: true });
};

const roleSchema = (create) => {
  const req = (x) => (create ? x : x.optional());
  return v.object({
    key: create ? v.string({ min: 2, max: 30, pattern: /^[a-z0-9_]+$/ }) : v.any().optional(),
    name: req(v.string({ min: 1, max: 30 })),
    description: v.string({ max: 300 }).optional(),
    color: v.color().optional(),
    icon: v.string({ max: 20 }).optional(),
    permissions: v.array(v.enum(['sell', 'cite', 'heal', 'broadcast', 'interview', 'announce', 'grant_bonus', 'perform', 'trigger_events']), { max: 12 }).optional(),
    salary: v.int({ min: 0, max: 10000 }).optional(),
    workZone: v.string({ max: 30 }).nullable().optional(),
    maxPerSession: v.int({ min: 1, max: 50 }).nullable().optional(),
    isDefault: v.bool().optional(),
    hostOnly: v.bool().optional(),
    sort: v.int({ min: 0, max: 1000 }).optional(),
  }, { strict: true });
};

const objectiveSchema = v.object({
  key: v.string({ max: 30 }).optional(),
  type: v.enum(['earn', 'work', 'collect', 'chat', 'buy', 'heal', 'cite', 'interview', 'perform', 'broadcast', 'clue', 'gift', 'visit']),
  target: v.int({ min: 1, max: 100000 }).optional(),
  zone: v.string({ max: 30 }).optional(),
  label: v.string({ max: 60 }).optional(),
  roles: v.array(v.string({ max: 30 }), { max: 20 }).optional(),
});

const scenarioConfigSchema = v.object({
  roles: v.any().optional(),
  startingCash: v.int({ min: 0, max: 1_000_000 }).optional(),
  timeLimitMinutes: v.int({ min: 1, max: 600 }).nullable().optional(),
  lighting: v.enum(['day', 'dusk', 'night']).optional(),
  objectives: v.array(objectiveSchema, { max: 12 }).optional(),
  autoEvents: v.array(v.object({ type: v.string({ max: 30 }), everySeconds: v.int({ min: 10, max: 7200 }), params: v.json({ maxBytes: 3000 }).default({}) }), { max: 10 }).optional(),
  completionReward: v.int({ min: 0, max: 1_000_000 }).nullable().optional(),
  initialPickups: v.int({ min: 0, max: 100 }).optional(),
  initialClues: v.int({ min: 0, max: 50 }).optional(),
  minPickups: v.int({ min: 0, max: 100 }).optional(),
  priceMultiplier: v.number({ min: 0.05, max: 10 }).optional(),
  salaryMultiplier: v.number({ min: 0, max: 20 }).optional(),
  fine: v.int({ min: 0, max: 10000 }).optional(),
  startEnergyByRole: v.json({ maxBytes: 1000 }).optional(),
  botLines: v.array(v.string({ max: 120 }), { max: 40 }).optional(),
});

function roleRow(r) {
  return {
    id: r.id, key: r.key, name: r.name, description: r.description, color: r.color, icon: r.icon, permissions: parseJson(r.permissions, []),
    salary: r.salary, workZone: r.work_zone, maxPerSession: r.max_per_session, isDefault: Boolean(r.is_default), hostOnly: Boolean(r.host_only), sort: r.sort,
  };
}

function scenarioRow(s) {
  return { id: s.id, key: s.key, name: s.name, description: s.description, config: parseJson(s.config, {}), isActive: Boolean(s.is_active), createdAt: s.created_at, updatedAt: s.updated_at };
}

export default function register(r) {
  // ───────────── Catalog items ─────────────
  r.get('/api/admin/items', ...A('catalog.manage'), (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 60, maxLimit: 300 });
    const where = ['1 = 1'];
    const params = [];
    if (ctx.query.q) { where.push('(name LIKE ? OR sku LIKE ?)'); params.push(`%${ctx.query.q}%`, `%${ctx.query.q}%`); }
    if (ctx.query.category) { where.push('category = ?'); params.push(String(ctx.query.category)); }
    if (ctx.query.archived !== '1') where.push('is_archived = 0');
    const rows = app.db.all(`SELECT * FROM items WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
    return page(rows.map((i) => itemView(i)), limit, offset);
  });

  r.post('/api/admin/items', ...A('catalog.manage'), (ctx) => {
    const b = check(itemSchema(true), ctx.body);
    const t = now();
    const sku = b.sku ?? `${b.category}-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${t.toString(36)}`;
    const id = app.db.run(
      `INSERT INTO items (sku, name, description, category, slot, asset, price, rarity, is_limited, stock, on_sale, is_featured, is_archived, creator_account_id, tags, bundle_item_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sku, b.name, b.description ?? '', b.category, b.slot, toJson(b.asset ?? { style: 'basic', colors: [] }), b.price, b.rarity ?? 'common',
      b.isLimited ? 1 : 0, b.stock ?? null, b.onSale === false ? 0 : 1, b.isFeatured ? 1 : 0, b.isArchived ? 1 : 0, b.creatorAccountId ?? null,
      toJson(b.tags ?? []), toJson(b.bundleItemIds ?? []), t, t).id;
    audit(ctx, 'item.create', 'item', id, { sku, name: b.name, price: b.price });
    ctx.status = 201;
    return itemView(app.db.get('SELECT * FROM items WHERE id = ?', id));
  });

  r.patch('/api/admin/items/:id', ...A('catalog.manage'), (ctx) => {
    const item = app.db.get('SELECT * FROM items WHERE id = ?', Number(ctx.params.id));
    if (!item) throw E.notFound('Item not found');
    const b = check(itemSchema(false), ctx.body);
    const map = {
      sku: 'sku', name: 'name', description: 'description', category: 'category', slot: 'slot', price: 'price', rarity: 'rarity',
      stock: 'stock', creatorAccountId: 'creator_account_id',
    };
    const sets = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) { sets.push(`${col} = ?`); params.push(b[k]); }
    for (const [k, col] of [['isLimited', 'is_limited'], ['onSale', 'on_sale'], ['isFeatured', 'is_featured'], ['isArchived', 'is_archived']]) {
      if (b[k] !== undefined) { sets.push(`${col} = ?`); params.push(b[k] ? 1 : 0); }
    }
    for (const [k, col] of [['asset', 'asset'], ['tags', 'tags'], ['bundleItemIds', 'bundle_item_ids']]) {
      if (b[k] !== undefined) { sets.push(`${col} = ?`); params.push(toJson(b[k])); }
    }
    if (sets.length) app.db.run(`UPDATE items SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, ...params, now(), item.id);
    audit(ctx, 'item.update', 'item', item.id, { changes: b, before: { price: item.price, rarity: item.rarity, onSale: item.on_sale } });
    return itemView(app.db.get('SELECT * FROM items WHERE id = ?', item.id));
  });

  r.post('/api/admin/items/:id/thumbnail', UPLOAD, ...A('catalog.manage'), (ctx) => {
    const item = app.db.get('SELECT * FROM items WHERE id = ?', Number(ctx.params.id));
    if (!item) throw E.notFound('Item not found');
    const { dataUrl } = check(v.object({ dataUrl: v.string({ min: 0, max: 3_000_000, trim: false }).nullable() }), ctx.body);
    const f = dataUrl ? saveDataUrl(dataUrl, { ownerUserId: ctx.user.id, purpose: 'item_thumbnail' }) : null;
    app.db.run('UPDATE items SET thumbnail_file_id = ?, updated_at = ? WHERE id = ?', f?.id ?? null, now(), item.id);
    audit(ctx, 'item.thumbnail', 'item', item.id, { file: f?.publicId ?? null });
    return { thumbnail: f?.url ?? null };
  });

  // ───────────── Experiences ─────────────
  r.get('/api/admin/experiences', ...A('experiences.manage'), (ctx) => ({
    items: experienceViews(app.db.all('SELECT * FROM experiences ORDER BY id'), ctx.account.id),
  }));

  r.post('/api/admin/experiences', ...A('experiences.manage'), (ctx) => {
    const b = check(experienceSchema(true), ctx.body);
    const t = now();
    const id = app.db.run(
      `INSERT INTO experiences (name, description, creator_account_id, creator_group_id, genre, art, engine, default_scenario_id, max_players, is_featured, status,
                                visits, likes, dislikes, favorites_override, active_override, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b.name, b.description ?? '', b.creatorAccountId ?? ctx.account.id, b.creatorGroupId ?? null, b.genre, toJson(b.art ?? { palette: ['#6d4aff', '#ff6b9a'], motif: 'city' }),
      b.engine ?? 'larp', b.defaultScenarioId ?? null, b.maxPlayers ?? 12, b.isFeatured ? 1 : 0, b.status ?? 'public', b.visits ?? 0, b.likes ?? 0, b.dislikes ?? 0,
      b.favoritesOverride ?? null, b.activeOverride ?? null, t, t).id;
    audit(ctx, 'experience.create', 'experience', id, { name: b.name });
    ctx.status = 201;
    return experienceViews([app.db.get('SELECT * FROM experiences WHERE id = ?', id)], ctx.account.id)[0];
  });

  r.patch('/api/admin/experiences/:id', ...A('experiences.manage'), (ctx) => {
    const e = app.db.get('SELECT * FROM experiences WHERE id = ?', Number(ctx.params.id));
    if (!e) throw E.notFound('Experience not found');
    const b = check(experienceSchema(false), ctx.body);
    const cols = {
      name: 'name', description: 'description', genre: 'genre', engine: 'engine', defaultScenarioId: 'default_scenario_id', maxPlayers: 'max_players',
      status: 'status', visits: 'visits', likes: 'likes', dislikes: 'dislikes', favoritesOverride: 'favorites_override', activeOverride: 'active_override',
      creatorAccountId: 'creator_account_id', creatorGroupId: 'creator_group_id',
    };
    const sets = [];
    const params = [];
    for (const [k, col] of Object.entries(cols)) if (b[k] !== undefined) { sets.push(`${col} = ?`); params.push(b[k]); }
    if (b.isFeatured !== undefined) { sets.push('is_featured = ?'); params.push(b.isFeatured ? 1 : 0); }
    if (b.art) { sets.push('art = ?'); params.push(toJson(b.art)); }
    if (sets.length) app.db.run(`UPDATE experiences SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, ...params, now(), e.id);
    audit(ctx, 'experience.update', 'experience', e.id, b);
    return experienceViews([app.db.get('SELECT * FROM experiences WHERE id = ?', e.id)], ctx.account.id)[0];
  });

  r.post('/api/admin/experiences/:id/thumbnail', UPLOAD, ...A('experiences.manage'), (ctx) => {
    const e = app.db.get('SELECT * FROM experiences WHERE id = ?', Number(ctx.params.id));
    if (!e) throw E.notFound('Experience not found');
    const { dataUrl } = check(v.object({ dataUrl: v.string({ min: 0, max: 3_000_000, trim: false }).nullable() }), ctx.body);
    const f = dataUrl ? saveDataUrl(dataUrl, { ownerUserId: ctx.user.id, purpose: 'experience_thumbnail' }) : null;
    app.db.run('UPDATE experiences SET thumbnail_file_id = ?, updated_at = ? WHERE id = ?', f?.id ?? null, now(), e.id);
    audit(ctx, 'experience.thumbnail', 'experience', e.id, { file: f?.publicId ?? null });
    return { thumbnail: f?.url ?? fileUrl(null) };
  });

  // ───────────── LARP game control ─────────────
  r.get('/api/admin/game/sessions', ...A('game.manage'), (ctx) => ({
    sessions: app.game.listSessions({ viewerId: ctx.account.id, isStaff: true, status: ctx.query.status ?? 'open', limit: 60 }),
  }));

  r.post('/api/admin/game/sessions', ...A('game.manage'), (ctx) => {
    const b = check(v.object({
      hostAccountId: v.int({ min: 1 }).optional(),
      experienceId: v.int({ min: 1 }),
      scenarioId: v.int({ min: 1 }).optional(),
      name: v.string({ min: 1, max: 50 }).optional(),
      privacy: v.enum(['public', 'friends', 'private']).default('public'),
      maxPlayers: v.int({ min: 1, max: 50 }).optional(),
      settings: settingsSchema.default({}),
    }), ctx.body);
    const host = b.hostAccountId ? requireAccount(b.hostAccountId) : ctx.account;
    const s = app.game.createSession({ account: host, ...b });
    audit(ctx, 'game.session_create', 'session', s.id, { host: host.id, experienceId: b.experienceId });
    ctx.status = 201;
    return s;
  });

  const sessionOp = (name, fn) => (ctx) => {
    const id = Number(ctx.params.id);
    app.game.runtime(id);
    const res = fn(ctx, id);
    audit(ctx, `game.${name}`, 'session', id, ctx.body);
    return res;
  };

  r.post('/api/admin/game/sessions/:id/control', ...A('game.manage'), sessionOp('control', (ctx, id) => {
    const { action } = check(v.object({ action: v.enum(['start', 'pause', 'resume', 'end', 'reset']) }), ctx.body);
    return app.game.control(id, action, ctx.account.id);
  }));
  r.patch('/api/admin/game/sessions/:id/settings', ...A('game.manage'), sessionOp('settings', (ctx, id) => {
    const b = check(v.object({ name: v.string({ min: 1, max: 50 }).optional(), privacy: v.enum(['public', 'friends', 'private']).optional(), maxPlayers: v.int({ min: 1, max: 50 }).optional(), settings: settingsSchema.optional() }), ctx.body);
    return app.game.updateSettings(id, b, ctx.account.id);
  }));
  r.post('/api/admin/game/sessions/:id/scenario', ...A('game.manage'), sessionOp('scenario', (ctx, id) => {
    const { scenarioId } = check(v.object({ scenarioId: v.int({ min: 1 }) }), ctx.body);
    return app.game.changeScenario(id, scenarioId, ctx.account.id);
  }));
  r.post('/api/admin/game/sessions/:id/assign-role', ...A('game.manage'), sessionOp('assign_role', (ctx, id) => {
    const { accountId, roleId } = check(v.object({ accountId: v.int({ min: 1 }), roleId: v.int({ min: 1 }) }), ctx.body);
    return app.game.setRole(id, accountId, roleId, { byHost: true });
  }));
  r.post('/api/admin/game/sessions/:id/kick', ...A('game.manage'), sessionOp('kick', (ctx, id) => {
    const { accountId } = check(v.object({ accountId: v.int({ min: 1 }) }), ctx.body);
    return app.game.leave(id, accountId, { kicked: true, reason: 'Removed by staff' });
  }));
  r.post('/api/admin/game/sessions/:id/participants', ...A('game.manage'), sessionOp('add_participant', (ctx, id) => {
    const { accountId, roleId, asExtra } = check(v.object({ accountId: v.int({ min: 1 }), roleId: v.int({ min: 1 }).optional(), asExtra: v.bool().default(true) }), ctx.body);
    const acc = requireAccount(accountId);
    return asExtra ? app.game.addBot(id, acc, { roleId }) : app.game.join(id, acc, { roleId, isStaff: true });
  }));
  r.post('/api/admin/game/sessions/:id/event', ...A('game.manage'), sessionOp('event', (ctx, id) => {
    const { type, params } = check(v.object({ type: v.enum(EVENT_TYPES.game), params: v.json({ maxBytes: 4000 }).default({}) }), ctx.body);
    return app.game.triggerEvent(id, type, params, { accountId: ctx.account.id, userId: ctx.user.id });
  }));

  r.get('/api/admin/game/roles', ...A('game.manage'), () => ({ roles: app.db.all('SELECT * FROM game_roles ORDER BY sort, id').map(roleRow) }));

  r.post('/api/admin/game/roles', ...A('game.manage'), (ctx) => {
    const b = check(roleSchema(true), ctx.body);
    const t = now();
    const id = app.db.run(
      `INSERT INTO game_roles (key, name, description, color, icon, permissions, salary, work_zone, max_per_session, is_default, host_only, sort, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b.key, b.name, b.description ?? '', b.color ?? '#64748b', b.icon ?? 'user', toJson(b.permissions ?? []), b.salary ?? 10, b.workZone ?? null,
      b.maxPerSession ?? null, b.isDefault ? 1 : 0, b.hostOnly ? 1 : 0, b.sort ?? 100, t, t).id;
    if (b.isDefault) app.db.run('UPDATE game_roles SET is_default = 0 WHERE id != ?', id);
    app.game.invalidateCatalog();
    audit(ctx, 'game.role_create', 'role', id, b);
    ctx.status = 201;
    return roleRow(app.db.get('SELECT * FROM game_roles WHERE id = ?', id));
  });

  r.patch('/api/admin/game/roles/:id', ...A('game.manage'), (ctx) => {
    const role = app.db.get('SELECT * FROM game_roles WHERE id = ?', Number(ctx.params.id));
    if (!role) throw E.notFound('Role not found');
    const b = check(roleSchema(false), ctx.body);
    app.db.tx(() => {
      app.db.run(`UPDATE game_roles SET name = ?, description = ?, color = ?, icon = ?, permissions = ?, salary = ?, work_zone = ?, max_per_session = ?, is_default = ?, host_only = ?, sort = ?, updated_at = ? WHERE id = ?`,
        b.name ?? role.name, b.description ?? role.description, b.color ?? role.color, b.icon ?? role.icon, b.permissions ? toJson(b.permissions) : role.permissions,
        b.salary ?? role.salary, b.workZone === undefined ? role.work_zone : b.workZone, b.maxPerSession === undefined ? role.max_per_session : b.maxPerSession,
        b.isDefault === undefined ? role.is_default : (b.isDefault ? 1 : 0), b.hostOnly === undefined ? role.host_only : (b.hostOnly ? 1 : 0), b.sort ?? role.sort, now(), role.id);
      if (b.isDefault) app.db.run('UPDATE game_roles SET is_default = 0 WHERE id != ?', role.id);
    });
    app.game.invalidateCatalog();
    audit(ctx, 'game.role_update', 'role', role.id, b);
    return roleRow(app.db.get('SELECT * FROM game_roles WHERE id = ?', role.id));
  });

  r.delete('/api/admin/game/roles/:id', ...A('game.manage'), (ctx) => {
    const role = app.db.get('SELECT * FROM game_roles WHERE id = ?', Number(ctx.params.id));
    if (!role) throw E.notFound('Role not found');
    if (role.is_default) throw E.bad('Choose another default role first');
    for (const rt of app.game.sessions.values()) for (const p of rt.players.values()) if (p.roleId === role.id) throw E.conflict('This role is in use in a running session');
    app.db.run('DELETE FROM game_roles WHERE id = ?', role.id);
    app.game.invalidateCatalog();
    audit(ctx, 'game.role_delete', 'role', role.id, { key: role.key });
    return { ok: true };
  });

  r.get('/api/admin/game/scenarios', ...A('game.manage'), () => ({ scenarios: app.db.all('SELECT * FROM scenarios ORDER BY id').map(scenarioRow) }));

  r.post('/api/admin/game/scenarios', ...A('game.manage'), (ctx) => {
    const b = check(v.object({
      key: v.string({ min: 2, max: 40, pattern: /^[a-z0-9_]+$/ }),
      name: v.string({ min: 1, max: 50 }),
      description: v.string({ max: 600, multiline: true }).default(''),
      config: scenarioConfigSchema.default({}),
    }), ctx.body);
    const t = now();
    const id = app.db.run('INSERT INTO scenarios (key, name, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', b.key, b.name, b.description, toJson(b.config), t, t).id;
    audit(ctx, 'game.scenario_create', 'scenario', id, { key: b.key });
    ctx.status = 201;
    return scenarioRow(app.db.get('SELECT * FROM scenarios WHERE id = ?', id));
  });

  r.patch('/api/admin/game/scenarios/:id', ...A('game.manage'), (ctx) => {
    const s = app.db.get('SELECT * FROM scenarios WHERE id = ?', Number(ctx.params.id));
    if (!s) throw E.notFound('Scenario not found');
    const b = check(v.object({ name: v.string({ min: 1, max: 50 }).optional(), description: v.string({ max: 600, multiline: true }).optional(), config: scenarioConfigSchema.optional(), isActive: v.bool().optional() }), ctx.body);
    app.db.run('UPDATE scenarios SET name = ?, description = ?, config = ?, is_active = ?, updated_at = ? WHERE id = ?',
      b.name ?? s.name, b.description ?? s.description, b.config ? toJson({ ...parseJson(s.config, {}), ...b.config }) : s.config,
      b.isActive === undefined ? s.is_active : (b.isActive ? 1 : 0), now(), s.id);
    app.game.invalidateCatalog();
    audit(ctx, 'game.scenario_update', 'scenario', s.id, b);
    return scenarioRow(app.db.get('SELECT * FROM scenarios WHERE id = ?', s.id));
  });

  r.post('/api/admin/game/scenarios/:id/duplicate', ...A('game.manage'), (ctx) => {
    const s = app.db.get('SELECT * FROM scenarios WHERE id = ?', Number(ctx.params.id));
    if (!s) throw E.notFound('Scenario not found');
    const t = now();
    const id = app.db.run('INSERT INTO scenarios (key, name, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      `${s.key}_copy_${t.toString(36)}`, `${s.name} (copy)`, s.description, s.config, t, t).id;
    audit(ctx, 'game.scenario_duplicate', 'scenario', id, { from: s.id });
    return scenarioRow(app.db.get('SELECT * FROM scenarios WHERE id = ?', id));
  });

  r.get('/api/admin/game/items', ...A('game.manage'), () => ({ items: app.game.itemList() }));

  r.post('/api/admin/game/items', ...A('game.manage'), (ctx) => {
    const b = check(v.object({
      key: v.string({ min: 2, max: 30, pattern: /^[a-z0-9_]+$/ }), name: v.string({ min: 1, max: 40 }), description: v.string({ max: 200 }).default(''),
      icon: v.string({ max: 20 }).default('box'), price: v.int({ min: 0, max: 100000 }), soldIn: v.string({ max: 30 }).nullable().default(null),
      effect: v.json({ maxBytes: 1000 }).default({}),
    }), ctx.body);
    const id = app.db.run('INSERT INTO game_items (key, name, description, icon, price, sold_in, effect, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      b.key, b.name, b.description, b.icon, b.price, b.soldIn, toJson(b.effect), now()).id;
    app.game.invalidateCatalog();
    audit(ctx, 'game.item_create', 'game_item', id, b);
    ctx.status = 201;
    return { id };
  });

  r.patch('/api/admin/game/items/:id', ...A('game.manage'), (ctx) => {
    const it = app.db.get('SELECT * FROM game_items WHERE id = ?', Number(ctx.params.id));
    if (!it) throw E.notFound('Item not found');
    const b = check(v.object({ name: v.string({ min: 1, max: 40 }).optional(), description: v.string({ max: 200 }).optional(), price: v.int({ min: 0, max: 100000 }).optional(), soldIn: v.string({ max: 30 }).nullable().optional(), effect: v.json({ maxBytes: 1000 }).optional() }), ctx.body);
    app.db.run('UPDATE game_items SET name = ?, description = ?, price = ?, sold_in = ?, effect = ? WHERE id = ?',
      b.name ?? it.name, b.description ?? it.description, b.price ?? it.price, b.soldIn === undefined ? it.sold_in : b.soldIn, b.effect ? toJson(b.effect) : it.effect, it.id);
    app.game.invalidateCatalog();
    audit(ctx, 'game.item_update', 'game_item', it.id, b);
    return { ok: true };
  });

  // ───────────── Scripted events ─────────────
  r.get('/api/admin/events', ...A('events.manage'), () => ({
    events: app.db.all('SELECT * FROM scripted_events ORDER BY scope, id').map(eventView),
    types: EVENT_TYPES,
  }));

  const eventSchema = (create) => v.object({
    name: create ? v.string({ min: 1, max: 60 }) : v.string({ min: 1, max: 60 }).optional(),
    description: v.string({ max: 400 }).optional(),
    scope: create ? v.enum(['platform', 'game']) : v.enum(['platform', 'game']).optional(),
    type: create ? v.string({ max: 40 }) : v.string({ max: 40 }).optional(),
    params: v.json({ maxBytes: 8000 }).optional(),
  }, { strict: true });

  r.post('/api/admin/events', ...A('events.manage'), (ctx) => {
    const b = check(eventSchema(true), ctx.body);
    if (!EVENT_TYPES[b.scope].includes(b.type)) throw E.bad(`Unknown ${b.scope} event type`);
    const t = now();
    const id = app.db.run('INSERT INTO scripted_events (name, description, scope, type, params, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      b.name, b.description ?? '', b.scope, b.type, toJson(b.params ?? {}), ctx.user.id, t, t).id;
    audit(ctx, 'event.create', 'event', id, b);
    ctx.status = 201;
    return eventView(app.db.get('SELECT * FROM scripted_events WHERE id = ?', id));
  });

  r.patch('/api/admin/events/:id', ...A('events.manage'), (ctx) => {
    const ev = app.db.get('SELECT * FROM scripted_events WHERE id = ?', Number(ctx.params.id));
    if (!ev) throw E.notFound('Event not found');
    const b = check(eventSchema(false), ctx.body);
    const scope = b.scope ?? ev.scope;
    const type = b.type ?? ev.type;
    if (!EVENT_TYPES[scope].includes(type)) throw E.bad(`Unknown ${scope} event type`);
    app.db.run('UPDATE scripted_events SET name = ?, description = ?, scope = ?, type = ?, params = ?, updated_at = ? WHERE id = ?',
      b.name ?? ev.name, b.description ?? ev.description, scope, type, b.params ? toJson(b.params) : ev.params, now(), ev.id);
    audit(ctx, 'event.update', 'event', ev.id, b);
    return eventView(app.db.get('SELECT * FROM scripted_events WHERE id = ?', ev.id));
  });

  r.delete('/api/admin/events/:id', ...A('events.manage'), (ctx) => {
    app.db.run('DELETE FROM scripted_events WHERE id = ?', Number(ctx.params.id));
    audit(ctx, 'event.delete', 'event', Number(ctx.params.id));
    return { ok: true };
  });

  r.post('/api/admin/events/:id/duplicate', ...A('events.manage'), (ctx) => {
    const ev = app.db.get('SELECT * FROM scripted_events WHERE id = ?', Number(ctx.params.id));
    if (!ev) throw E.notFound('Event not found');
    const t = now();
    const id = app.db.run('INSERT INTO scripted_events (name, description, scope, type, params, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      `${ev.name} (copy)`, ev.description, ev.scope, ev.type, ev.params, ctx.user.id, t, t).id;
    audit(ctx, 'event.duplicate', 'event', id, { from: ev.id });
    return eventView(app.db.get('SELECT * FROM scripted_events WHERE id = ?', id));
  });

  const runSchema = v.object({ accountIds: v.array(v.int({ min: 1 }), { max: 500 }).default([]), sessionId: v.int({ min: 1 }).nullable().optional(), overrides: v.json({ maxBytes: 8000 }).default({}) });

  r.post('/api/admin/events/:id/run', ...A('events.manage'), (ctx) => {
    const ev = app.db.get('SELECT * FROM scripted_events WHERE id = ?', Number(ctx.params.id));
    if (!ev) throw E.notFound('Event not found');
    const b = check(runSchema, ctx.body);
    return { result: runEvent(ev, { ctx, accountIds: b.accountIds, sessionId: b.sessionId, overrides: b.overrides }), event: eventView(app.db.get('SELECT * FROM scripted_events WHERE id = ?', ev.id)) };
  });

  r.post('/api/admin/events/run-adhoc', ...A('events.manage'), (ctx) => {
    const b = check(v.object({ scope: v.enum(['platform', 'game']), type: v.string({ max: 40 }), params: v.json({ maxBytes: 8000 }).default({}), accountIds: v.array(v.int({ min: 1 }), { max: 500 }).default([]), sessionId: v.int({ min: 1 }).nullable().optional() }), ctx.body);
    if (!EVENT_TYPES[b.scope].includes(b.type)) throw E.bad('Unknown event type');
    return { result: runEvent({ id: null, scope: b.scope, type: b.type, params: toJson(b.params) }, { ctx, accountIds: b.accountIds, sessionId: b.sessionId }) };
  });

  r.get('/api/admin/events/:id/runs', ...A('events.manage'), (ctx) => ({
    runs: app.db.all('SELECT r.*, u.username FROM event_runs r LEFT JOIN users u ON u.id = r.triggered_by_user_id WHERE event_id = ? ORDER BY r.id DESC LIMIT 50', Number(ctx.params.id))
      .map((x) => ({ id: x.id, by: x.username, target: parseJson(x.target, {}), result: parseJson(x.result, {}), at: x.created_at })),
  }));

  // ───────────── Scenario presets ─────────────
  r.get('/api/admin/presets', ...A('presets.manage'), () => ({ presets: app.db.all('SELECT * FROM presets ORDER BY kind, name').map(presetView), kinds: PRESET_KINDS }));

  const presetMeta = v.object({ name: v.string({ min: 1, max: 60 }), kind: v.enum(PRESET_KINDS).default('custom'), description: v.string({ max: 400 }).default('') });

  r.post('/api/admin/presets', ...A('presets.manage'), (ctx) => {
    const meta = check(presetMeta, ctx.body);
    const data = check(presetDataSchema, ctx.body.data ?? {});
    const t = now();
    const id = app.db.run('INSERT INTO presets (name, kind, description, data, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', meta.name, meta.kind, meta.description, toJson(data), ctx.user.id, t, t).id;
    audit(ctx, 'preset.create', 'preset', id, { name: meta.name });
    ctx.status = 201;
    return presetView(app.db.get('SELECT * FROM presets WHERE id = ?', id));
  });

  r.post('/api/admin/presets/from-account/:accountId', ...A('presets.manage'), (ctx) => {
    const meta = check(presetMeta, ctx.body);
    const data = snapshotAccount(requireAccount(Number(ctx.params.accountId)).id);
    const t = now();
    const id = app.db.run('INSERT INTO presets (name, kind, description, data, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', meta.name, meta.kind, meta.description, toJson(data), ctx.user.id, t, t).id;
    audit(ctx, 'preset.snapshot', 'preset', id, { accountId: Number(ctx.params.accountId) });
    ctx.status = 201;
    return presetView(app.db.get('SELECT * FROM presets WHERE id = ?', id));
  });

  r.get('/api/admin/presets/:id', ...A('presets.manage'), (ctx) => {
    const p = app.db.get('SELECT * FROM presets WHERE id = ?', Number(ctx.params.id));
    if (!p) throw E.notFound('Preset not found');
    return presetView(p);
  });

  r.patch('/api/admin/presets/:id', ...A('presets.manage'), (ctx) => {
    const p = app.db.get('SELECT * FROM presets WHERE id = ?', Number(ctx.params.id));
    if (!p) throw E.notFound('Preset not found');
    const b = check(v.object({ name: v.string({ min: 1, max: 60 }).optional(), kind: v.enum(PRESET_KINDS).optional(), description: v.string({ max: 400 }).optional(), data: v.any().optional() }), ctx.body);
    const data = b.data !== undefined ? check(presetDataSchema, b.data) : parseJson(p.data, {});
    app.db.run('UPDATE presets SET name = ?, kind = ?, description = ?, data = ?, updated_at = ? WHERE id = ?', b.name ?? p.name, b.kind ?? p.kind, b.description ?? p.description, toJson(data), now(), p.id);
    audit(ctx, 'preset.update', 'preset', p.id, { name: b.name });
    return presetView(app.db.get('SELECT * FROM presets WHERE id = ?', p.id));
  });

  r.delete('/api/admin/presets/:id', ...A('presets.manage'), (ctx) => {
    app.db.run('DELETE FROM presets WHERE id = ?', Number(ctx.params.id));
    audit(ctx, 'preset.delete', 'preset', Number(ctx.params.id));
    return { ok: true };
  });

  r.post('/api/admin/presets/:id/duplicate', ...A('presets.manage'), (ctx) => {
    const p = app.db.get('SELECT * FROM presets WHERE id = ?', Number(ctx.params.id));
    if (!p) throw E.notFound('Preset not found');
    const t = now();
    const id = app.db.run('INSERT INTO presets (name, kind, description, data, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', `${p.name} (copy)`, p.kind, p.description, p.data, ctx.user.id, t, t).id;
    audit(ctx, 'preset.duplicate', 'preset', id, { from: p.id });
    return presetView(app.db.get('SELECT * FROM presets WHERE id = ?', id));
  });

  r.get('/api/admin/presets/:id/export', ...A('presets.manage'), (ctx) => {
    const p = app.db.get('SELECT * FROM presets WHERE id = ?', Number(ctx.params.id));
    if (!p) throw E.notFound('Preset not found');
    audit(ctx, 'preset.export', 'preset', p.id);
    return { format: 'larpverse-preset', version: 1, exportedAt: now(), preset: { name: p.name, kind: p.kind, description: p.description, data: parseJson(p.data, {}) } };
  });

  r.post('/api/admin/presets/import', ...A('presets.manage'), (ctx) => {
    const body = ctx.body;
    if (body?.format !== 'larpverse-preset' || !body.preset) throw E.bad('This is not a Larpverse preset export');
    const meta = check(presetMeta, body.preset);
    const data = check(presetDataSchema, body.preset.data ?? {});
    const t = now();
    const id = app.db.run('INSERT INTO presets (name, kind, description, data, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', meta.name, meta.kind, meta.description, toJson(data), ctx.user.id, t, t).id;
    audit(ctx, 'preset.import', 'preset', id, { name: meta.name });
    ctx.status = 201;
    return presetView(app.db.get('SELECT * FROM presets WHERE id = ?', id));
  });

  r.post('/api/admin/presets/:id/apply', ...A('presets.manage'), (ctx) => {
    const p = app.db.get('SELECT * FROM presets WHERE id = ?', Number(ctx.params.id));
    if (!p) throw E.notFound('Preset not found');
    const { accountId, switchTo } = check(v.object({ accountId: v.int({ min: 1 }), switchTo: v.bool().default(false) }), ctx.body);
    const acc = requireAccount(accountId);
    const report = applyPreset(acc.id, parseJson(p.data, {}), { userId: ctx.user.id, presetName: p.name });
    if (switchTo) {
      if (!acc.is_fictional && acc.owner_user_id !== ctx.user.id) throw E.forbidden('Only fictional accounts can be switched into');
      app.db.run('UPDATE auth_sessions SET acting_account_id = ? WHERE id = ?', acc.id, ctx.session.id);
    }
    audit(ctx, 'preset.apply', 'account', acc.id, { presetId: p.id, preset: p.name, switchTo, skipped: report.skipped.length });
    return { ok: true, report };
  });

  // ───────────── Scripted notifications ─────────────
  r.post('/api/admin/notifications', ...A('notifications.manage'), (ctx) => {
    const b = check(v.object({
      accountIds: v.array(v.int({ min: 1 }), { min: 1, max: 1000 }),
      type: v.enum(NOTIFICATION_TYPES).default('system'),
      title: v.string({ min: 1, max: 140 }),
      body: v.string({ max: 600 }).default(''),
      actorAccountId: v.int({ min: 1 }).nullable().optional(),
      delaySeconds: v.int({ min: 0, max: 86400 }).default(0),
      data: v.json({ maxBytes: 2000 }).default({}),
    }), ctx.body);
    app.db.tx(() => {
      for (const id of b.accountIds) {
        requireAccount(id);
        const payload = { accountId: id, type: b.type, title: b.title, body: b.body, actorId: b.actorAccountId ?? null, data: b.data, scripted: true };
        if (b.delaySeconds) schedule('notification', payload, b.delaySeconds * 1000);
        else notify(id, { ...payload, force: true });
      }
      audit(ctx, 'notification.send', null, null, { count: b.accountIds.length, title: b.title, delaySeconds: b.delaySeconds });
    });
    return { sent: b.accountIds.length, scheduled: b.delaySeconds > 0 };
  });

  // ───────────── Audit log ─────────────
  r.get('/api/admin/audit', ...A('audit.view'), (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 60, maxLimit: 200 });
    const where = ['1 = 1'];
    const params = [];
    if (ctx.query.action) { where.push('a.action LIKE ?'); params.push(`${ctx.query.action}%`); }
    if (ctx.query.userId) { where.push('a.user_id = ?'); params.push(Number(ctx.query.userId)); }
    if (ctx.query.targetType) { where.push('a.target_type = ?'); params.push(String(ctx.query.targetType)); }
    if (ctx.query.targetId) { where.push('a.target_id = ?'); params.push(Number(ctx.query.targetId)); }
    const rows = app.db.all(
      `SELECT a.*, u.username, ac.username AS acting FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN accounts ac ON ac.id = a.acting_account_id
        WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
    return page(rows.map((l) => ({
      id: l.id, action: l.action, user: l.username, userId: l.user_id, actingAs: l.acting, targetType: l.target_type, targetId: l.target_id,
      details: parseJson(l.details, {}), ip: l.ip, at: l.created_at,
    })), limit, offset);
  });

  // ───────────── Configuration ─────────────
  r.get('/api/admin/config', ...A('config.manage'), () => ({ economy: getConfig('economy'), platform: getConfig('platform') }));

  r.patch('/api/admin/config', ...A('config.manage'), (ctx) => {
    const b = check(v.object({
      economy: v.object({
        startingBalance: v.int({ min: 0, max: 1e9 }).optional(), dailyReward: v.int({ min: 0, max: 1e7 }).optional(),
        dailyCooldownHours: v.int({ min: 1, max: 168 }).optional(), sessionCompletionReward: v.int({ min: 0, max: 1e7 }).optional(),
        groupCreateCost: v.int({ min: 0, max: 1e7 }).optional(), usernameChangeCost: v.int({ min: 0, max: 1e7 }).optional(),
        creatorShare: v.number({ min: 0, max: 1 }).optional(), refundWindowMinutes: v.int({ min: 0, max: 10080 }).optional(),
        maxAltAccounts: v.int({ min: 0, max: 20 }).optional(),
      }, { strict: true }).optional(),
      platform: v.object({ motd: v.string({ max: 200 }).optional() }, { strict: true }).optional(),
    }), ctx.body);
    const out = {};
    if (b.economy) out.economy = setConfig('economy', b.economy);
    if (b.platform) out.platform = setConfig('platform', b.platform);
    audit(ctx, 'config.update', null, null, b);
    return { economy: getConfig('economy'), platform: getConfig('platform') };
  });

  // ───────────── Staff logins & permissions ─────────────
  r.get('/api/admin/staff', ...A('staff.manage'), () => ({
    permissions: PERMISSIONS,
    users: app.db.all('SELECT id, username, staff_role, status, mfa_enabled, created_at, last_login_at FROM users ORDER BY CASE staff_role WHEN \'owner\' THEN 0 WHEN \'admin\' THEN 1 WHEN \'moderator\' THEN 2 ELSE 3 END, username')
      .map((u) => ({
        id: u.id, username: u.username, staffRole: u.staff_role, status: u.status, mfaEnabled: Boolean(u.mfa_enabled), createdAt: u.created_at, lastLoginAt: u.last_login_at,
        overrides: Object.fromEntries(app.db.all('SELECT permission, granted FROM user_permission_overrides WHERE user_id = ?', u.id).map((o) => [o.permission, Boolean(o.granted)])),
      })),
  }));

  r.post('/api/admin/staff', ...A('staff.manage'), async (ctx) => {
    const b = check(v.object({ username: v.string({ min: 3, max: 20 }), password: v.string({ min: 1, max: 200, trim: false }), staffRole: v.enum(['admin', 'moderator', 'user']) }), ctx.body);
    const problem = passwordProblem(b.password);
    if (problem) throw E.bad(problem, { field: 'password' });
    const hash = await hashPassword(b.password);
    const id = app.db.tx(() => {
      if (app.db.get('SELECT 1 FROM users WHERE username = ?', b.username)) throw E.conflict('That username is taken', 'username_taken');
      const t = now();
      const uid = app.db.run('INSERT INTO users (username, password_hash, staff_role, created_at, password_changed_at) VALUES (?, ?, ?, ?, ?)', b.username, hash, b.staffRole, t, t).id;
      createAccount({ ownerUserId: uid, username: b.username, displayName: b.username, isPrimary: true });
      syncSystemBadges(uid);
      audit(ctx, 'staff.create', 'user', uid, { username: b.username, staffRole: b.staffRole });
      return uid;
    });
    ctx.status = 201;
    return { id };
  });

  r.patch('/api/admin/staff/:id', ...A('staff.manage'), (ctx) => {
    const target = app.db.get('SELECT * FROM users WHERE id = ?', Number(ctx.params.id));
    if (!target) throw E.notFound('Login not found');
    const b = check(v.object({ staffRole: v.enum(['owner', 'admin', 'moderator', 'user']).optional(), status: v.enum(['active', 'disabled']).optional() }), ctx.body);
    if (target.id === ctx.user.id) throw E.bad('You cannot change your own staff role or status');
    if (STAFF_RANK[target.staff_role] >= STAFF_RANK[ctx.user.staff_role]) throw E.forbidden('You can only manage logins below your own rank');
    if (b.staffRole && STAFF_RANK[b.staffRole] >= STAFF_RANK[ctx.user.staff_role]) throw E.forbidden('You cannot grant a rank equal to or above your own');
    app.db.tx(() => {
      if (b.staffRole) app.db.run('UPDATE users SET staff_role = ? WHERE id = ?', b.staffRole, target.id);
      if (b.status) {
        app.db.run('UPDATE users SET status = ? WHERE id = ?', b.status, target.id);
        if (b.status === 'disabled') app.db.run('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', now(), target.id);
      }
      syncSystemBadges(target.id);
      audit(ctx, 'staff.update', 'user', target.id, { ...b, before: { staffRole: target.staff_role, status: target.status } });
    });
    return { ok: true };
  });

  r.put('/api/admin/staff/:id/permissions', ...A('staff.manage'), (ctx) => {
    const target = app.db.get('SELECT * FROM users WHERE id = ?', Number(ctx.params.id));
    if (!target) throw E.notFound('Login not found');
    if (target.id === ctx.user.id) throw E.bad('You cannot change your own permissions');
    if (STAFF_RANK[target.staff_role] >= STAFF_RANK[ctx.user.staff_role]) throw E.forbidden('You can only manage logins below your own rank');
    const { overrides } = check(v.object({ overrides: v.json({ maxBytes: 4000 }) }), ctx.body);
    app.db.tx(() => {
      for (const [perm, val] of Object.entries(overrides)) {
        if (!ALL_PERMISSIONS.includes(perm) || perm === 'staff.manage') throw E.bad(`Cannot override ${perm}`);
        if (val === null) app.db.run('DELETE FROM user_permission_overrides WHERE user_id = ? AND permission = ?', target.id, perm);
        else app.db.run(`INSERT INTO user_permission_overrides (user_id, permission, granted) VALUES (?, ?, ?)
                         ON CONFLICT(user_id, permission) DO UPDATE SET granted = excluded.granted`, target.id, perm, val ? 1 : 0);
      }
      audit(ctx, 'staff.permissions', 'user', target.id, overrides);
    });
    return { ok: true };
  });
}
