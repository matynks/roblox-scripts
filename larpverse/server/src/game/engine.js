import { app } from '../app.js';
import { E } from '../http.js';
import { areFriends } from '../services/accounts.js';
import { avatarSpecs } from '../services/avatar.js';
import { assignBadge } from '../services/badges.js';
import { getConfig } from '../services/config.js';
import { grantItem } from '../services/inventory.js';
import { notify } from '../services/notify.js';
import { credit } from '../services/wallet.js';
import { clamp, now, parseJson, randomCode, toJson } from '../util.js';
import { inZone, moveWithCollision, randomFreePoint, routeTo, WORLD, zoneAt, zoneByKey } from './world.js';

const SPEED = 230;
const RANGE = 120;
const MAX_ENERGY = 100;
const WORK_COST = 8;
const DEFAULT_EMOTES = ['wave', 'cheer', 'dance', 'clap'];
const STAT_KEYS = ['earned', 'shifts', 'pickups', 'chats', 'purchases', 'heals', 'citations', 'interviews', 'performances', 'broadcasts', 'clues', 'gifts'];
const OBJECTIVE_STAT = {
  earn: 'earned', work: 'shifts', collect: 'pickups', chat: 'chats', buy: 'purchases', heal: 'heals', cite: 'citations',
  interview: 'interviews', perform: 'performances', broadcast: 'broadcasts', clue: 'clues', gift: 'gifts',
};
const BOT_LINES = [
  'Beautiful day in Larpverse City!', 'Anyone seen the mayor?', 'The café has the best coffee.', 'Who wants to grab lunch?',
  'Heading to work, see you later!', 'Did you hear the news today?', 'This plaza is so lively.', 'Shopping time!',
];

export const DEFAULT_SESSION_SETTINGS = {
  allowRoleSwitch: true,
  chatEnabled: true,
  hostEvents: true,
  allowBots: true,
  startingCash: null,
  timeLimitMinutes: null,
};

export const GAME_EVENT_TYPES = ['coin_rain', 'market_sale', 'breaking_news', 'blackout', 'award_ceremony', 'cash_bonus', 'clue_hunt', 'announcement', 'weather_rain', 'spotlight'];

const levelFor = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Simplified top-down look derived from a platform avatar (or a custom character look). */
export function lookFromAvatar(spec) {
  const slot = (s) => spec.items.find((i) => i.slot === s);
  const c = spec.bodyColors;
  const shirt = slot('shirt');
  const pants = slot('pants');
  const hair = slot('hair');
  const hat = slot('hat');
  const back = slot('back');
  const aura = slot('aura');
  return {
    skin: c.head,
    shirt: shirt?.colors?.[0] ?? c.torso,
    pants: pants?.colors?.[0] ?? c.leftLeg,
    hair: hair ? { style: hair.style, color: hair.colors?.[0] ?? '#3b2a20' } : null,
    hat: hat ? { style: hat.style, color: hat.colors?.[0] ?? '#222222' } : null,
    back: back ? { style: back.style, color: back.colors?.[0] ?? '#ffffff' } : null,
    aura: aura ? aura.style : null,
  };
}

export class GameEngine {
  constructor() {
    this.sessions = new Map();
    this.roleCache = null;
    this.itemCache = null;
    this.rand = Math.random;
    const cfg = app.cfg;
    this.tickTimer = setInterval(() => this.safe(() => this.tick(cfg.gameTickMs / 1000)), cfg.gameTickMs);
    this.broadcastTimer = setInterval(() => this.safe(() => this.broadcastTicks()), cfg.gameBroadcastMs);
    this.persistTimer = setInterval(() => this.safe(() => this.persistAll(false)), 15_000);
    this.heartbeatTimer = setInterval(() => this.safe(() => this.heartbeat()), 15_000);
    for (const t of [this.tickTimer, this.broadcastTimer, this.persistTimer, this.heartbeatTimer]) t.unref();
  }

  safe(fn) {
    try { fn(); } catch (e) { app.log('game engine error', e); }
  }

  stop() {
    clearInterval(this.tickTimer);
    clearInterval(this.broadcastTimer);
    clearInterval(this.persistTimer);
    clearInterval(this.heartbeatTimer);
    this.persistAll(true);
    for (const rt of this.sessions.values()) for (const c of rt.clients) c.res.end();
  }

  /** After a restart, sessions that were running come back paused with their saved state. */
  restore() {
    app.db.run("UPDATE larp_sessions SET status = 'paused' WHERE status = 'active'");
  }

  // ───────────────────────── Catalog data ─────────────────────────

  roles() {
    if (!this.roleCache) {
      this.roleCache = new Map(app.db.all('SELECT * FROM game_roles ORDER BY sort, id').map((r) => [r.id, { ...r, permissions: parseJson(r.permissions, []) }]));
    }
    return this.roleCache;
  }

  gameItems() {
    if (!this.itemCache) {
      this.itemCache = new Map(app.db.all('SELECT * FROM game_items ORDER BY price').map((i) => [i.id, { ...i, effect: parseJson(i.effect, {}) }]));
    }
    return this.itemCache;
  }

  invalidateCatalog() {
    this.roleCache = null;
    this.itemCache = null;
    for (const rt of this.sessions.values()) {
      rt.scenario = this.loadScenario(rt.scenario.id);
      this.broadcast(rt, { type: 'catalog', roles: this.roleList(), gameItems: this.itemList() });
    }
  }

  roleList() {
    return [...this.roles().values()].map((r) => ({
      id: r.id, key: r.key, name: r.name, description: r.description, color: r.color, icon: r.icon,
      permissions: r.permissions, salary: r.salary, workZone: r.work_zone, maxPerSession: r.max_per_session, isDefault: Boolean(r.is_default), hostOnly: Boolean(r.host_only),
    }));
  }

  itemList() {
    return [...this.gameItems().values()].map((i) => ({ id: i.id, key: i.key, name: i.name, description: i.description, icon: i.icon, price: i.price, soldIn: i.sold_in, effect: i.effect }));
  }

  loadScenario(id) {
    const s = app.db.get('SELECT * FROM scenarios WHERE id = ?', id);
    if (!s) throw E.notFound('Scenario not found');
    return { id: s.id, key: s.key, name: s.name, description: s.description, config: parseJson(s.config, {}) };
  }

  enabledRoles(scenario) {
    const allowed = scenario.config.roles;
    return [...this.roles().values()].filter((r) => !Array.isArray(allowed) || allowed.includes(r.key));
  }

  defaultRole(scenario) {
    const enabled = this.enabledRoles(scenario).filter((r) => !r.host_only);
    return enabled.find((r) => r.is_default) ?? enabled[0] ?? [...this.roles().values()][0];
  }

  // ───────────────────────── Runtime lifecycle ─────────────────────────

  runtime(sessionId, { required = true } = {}) {
    let rt = this.sessions.get(sessionId);
    if (!rt) rt = this.load(sessionId);
    if (!rt && required) throw E.notFound('Session not found or already ended');
    return rt;
  }

  load(sessionId) {
    const { db } = app;
    const s = db.get('SELECT * FROM larp_sessions WHERE id = ?', sessionId);
    if (!s || s.status === 'ended') return null;
    const exp = db.get('SELECT id, name FROM experiences WHERE id = ?', s.experience_id);
    const rt = {
      id: s.id,
      experienceId: s.experience_id,
      experienceName: exp?.name ?? 'Experience',
      name: s.name,
      status: s.status,
      hostId: s.host_account_id,
      privacy: s.privacy,
      accessCode: s.access_code,
      maxPlayers: s.max_players,
      settings: { ...DEFAULT_SESSION_SETTINGS, ...parseJson(s.settings, {}) },
      scenario: this.loadScenario(s.scenario_id),
      players: new Map(),
      pickups: new Map(),
      nextPickupId: 1,
      effects: {},
      banners: [],
      chat: [],
      feed: [],
      cityFund: 0,
      clients: new Set(),
      elapsedMs: 0,
      emptySince: null,
      nextAuto: {},
      completions: new Set(),
      startedAt: s.started_at,
      createdAt: s.created_at,
      lastPersist: now(),
    };
    const state = parseJson(s.state, null);
    if (state) {
      for (const pk of state.pickups ?? []) rt.pickups.set(pk.id, pk);
      rt.nextPickupId = state.nextPickupId ?? rt.pickups.size + 1;
      rt.cityFund = state.cityFund ?? 0;
      rt.elapsedMs = state.elapsedMs ?? 0;
      rt.chat = state.chat ?? [];
      rt.feed = state.feed ?? [];
      rt.completions = new Set(state.completions ?? []);
    }
    this.sessions.set(rt.id, rt);
    for (const p of db.all("SELECT * FROM session_participants WHERE session_id = ? AND status = 'active'", rt.id)) {
      this.spawnPlayer(rt, p, state?.players?.[p.account_id]);
    }
    if (!state) this.seedPickups(rt);
    return rt;
  }

  seedPickups(rt) {
    const cfg = rt.scenario.config;
    const n = cfg.initialPickups ?? 10;
    for (let i = 0; i < n; i++) this.addPickup(rt, 'spark');
    for (let i = 0; i < (cfg.initialClues ?? 0); i++) this.addPickup(rt, 'clue');
  }

  addPickup(rt, type, near = null, value = null) {
    let pos;
    if (type === 'clue') {
      const buildings = WORLD.zones.filter((z) => z.kind === 'building');
      pos = randomFreePoint(this.rand, buildings[Math.floor(this.rand() * buildings.length)].key);
    } else if (near) {
      pos = randomFreePoint(this.rand, near);
    } else {
      pos = randomFreePoint(this.rand);
    }
    const pk = { id: rt.nextPickupId++, type, x: Math.round(pos.x), y: Math.round(pos.y), value: value ?? (type === 'spark' ? 5 + Math.floor(this.rand() * 4) * 5 : 0) };
    rt.pickups.set(pk.id, pk);
    return pk;
  }

  characterLook(characterId, accountId) {
    const ch = characterId ? app.db.get('SELECT appearance FROM characters WHERE id = ?', characterId) : null;
    const appearance = parseJson(ch?.appearance, { useAvatar: true });
    const fromAvatar = lookFromAvatar(avatarSpecs([accountId]).get(accountId));
    if (appearance.useAvatar !== false) return fromAvatar;
    return { ...fromAvatar, ...appearance.look };
  }

  spawnPlayer(rt, part, saved = null) {
    const { db } = app;
    const acc = db.get('SELECT id, username, display_name, is_fictional FROM accounts WHERE id = ?', part.account_id);
    if (!acc) return null;
    const ch = part.character_id ? db.get('SELECT * FROM characters WHERE id = ?', part.character_id) : null;
    const roles = this.roles();
    const role = roles.get(part.role_id) ?? this.defaultRole(rt.scenario);
    const chStats = parseJson(ch?.stats, {});
    const cfg = rt.scenario.config;
    const startCash = rt.settings.startingCash ?? cfg.startingCash ?? 100;
    const startEnergy = cfg.startEnergyByRole?.[role.key] ?? MAX_ENERGY;
    const spawnZone = role.work_zone && zoneByKey(role.work_zone);
    let pos = saved ? { x: saved.x, y: saved.y } : null;
    if (!pos) {
      pos = spawnZone?.kind === 'building' ? { ...spawnZone.doors.outside } : randomFreePoint(this.rand, 'plaza');
      pos.x += (this.rand() - 0.5) * 60;
    }
    const inventory = new Map();
    if (ch) for (const row of db.all('SELECT game_item_id, quantity FROM character_inventory WHERE character_id = ? AND quantity > 0', ch.id)) inventory.set(row.game_item_id, row.quantity);
    const pstats = parseJson(part.stats, {});
    const p = {
      accountId: acc.id,
      username: acc.username,
      characterId: ch?.id ?? null,
      name: ch?.name ?? acc.display_name,
      roleId: role.id,
      x: pos.x,
      y: pos.y,
      input: { x: 0, y: 0 },
      facing: 1,
      moving: false,
      look: this.characterLook(ch?.id, acc.id),
      cash: saved?.cash ?? startCash,
      startCash: saved?.startCash ?? startCash,
      energy: saved?.energy ?? startEnergy,
      xp: saved?.xp ?? chStats.xp ?? 0,
      reputation: saved?.reputation ?? chStats.reputation ?? 0,
      inventory,
      stats: { ...Object.fromEntries(STAT_KEYS.map((k) => [k, 0])), visited: {}, ...(saved?.stats ?? pstats.session ?? {}) },
      emote: null,
      bubble: null,
      cooldowns: {},
      isBot: Boolean(part.is_bot),
      bot: part.is_bot ? { route: [], next: 0, nextLine: now() + 8000 + this.rand() * 20000, nextWork: 0 } : null,
      connected: 0,
      lastActive: now(),
      lastInputAt: 0,
      deposited: false,
      completed: rt.completions.has(acc.id),
    };
    rt.players.set(acc.id, p);
    return p;
  }

  // ───────────────────────── Queries ─────────────────────────

  presenceOf(accountId) {
    for (const rt of this.sessions.values()) {
      const p = rt.players.get(accountId);
      if (p && (p.connected > 0 || p.isBot)) return { experienceId: rt.experienceId, experienceName: rt.experienceName, sessionId: rt.id };
    }
    return null;
  }

  activePlayers(experienceId) {
    let n = 0;
    for (const rt of this.sessions.values()) {
      if (rt.experienceId !== experienceId) continue;
      for (const p of rt.players.values()) if (p.connected > 0 || p.isBot) n++;
    }
    return n;
  }

  canSee(s, viewerId, isStaff) {
    if (isStaff || s.host_account_id === viewerId) return true;
    if (viewerId && app.db.get("SELECT 1 FROM session_participants WHERE session_id = ? AND account_id = ? AND status = 'active'", s.id, viewerId)) return true;
    if (s.privacy === 'public') return true;
    if (s.privacy === 'friends') return viewerId ? areFriends(viewerId, s.host_account_id) : false;
    return false;
  }

  sessionSummary(s, viewerId = null, isStaff = false) {
    const { db } = app;
    const rt = this.sessions.get(s.id);
    const count = db.value("SELECT COUNT(*) FROM session_participants WHERE session_id = ? AND status = 'active'", s.id);
    const scenario = db.get('SELECT id, key, name FROM scenarios WHERE id = ?', s.scenario_id);
    const host = s.host_account_id ? db.get('SELECT id, username, display_name FROM accounts WHERE id = ?', s.host_account_id) : null;
    const isHost = viewerId != null && viewerId === s.host_account_id;
    return {
      id: s.id,
      name: s.name,
      status: s.status,
      privacy: s.privacy,
      experienceId: s.experience_id,
      scenario,
      host: host ? { id: host.id, username: host.username, displayName: host.display_name } : null,
      players: count,
      connected: rt ? [...rt.players.values()].filter((p) => p.connected > 0 || p.isBot).length : 0,
      maxPlayers: s.max_players,
      settings: { ...DEFAULT_SESSION_SETTINGS, ...parseJson(s.settings, {}) },
      accessCode: isHost || isStaff ? s.access_code : undefined,
      createdAt: s.created_at,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      elapsedMs: rt?.elapsedMs ?? null,
      summary: s.status === 'ended' ? parseJson(s.summary, null) : undefined,
    };
  }

  listSessions({ experienceId = null, viewerId = null, isStaff = false, status = 'open', limit = 30 } = {}) {
    const where = [];
    const params = [];
    if (experienceId) { where.push('experience_id = ?'); params.push(experienceId); }
    if (status === 'open') where.push("status != 'ended'");
    else if (status) { where.push('status = ?'); params.push(status); }
    const rows = app.db.all(`SELECT * FROM larp_sessions ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ?`, ...params, limit * 3);
    return rows.filter((s) => this.canSee(s, viewerId, isStaff)).slice(0, limit).map((s) => this.sessionSummary(s, viewerId, isStaff));
  }

  // ───────────────────────── Session management ─────────────────────────

  createSession({ account, experienceId, scenarioId, name, privacy = 'public', maxPlayers, settings = {}, characterId, roleId }) {
    const { db } = app;
    const exp = db.get("SELECT * FROM experiences WHERE id = ? AND engine = 'larp' AND status != 'archived'", experienceId);
    if (!exp) throw E.notFound('This experience does not support LARP sessions');
    const scenario = this.loadScenario(scenarioId ?? exp.default_scenario_id ?? db.value('SELECT id FROM scenarios WHERE is_active = 1 ORDER BY id LIMIT 1'));
    const perks = parseJson(db.value(
      `SELECT json_group_array(b.perks) FROM account_badges ab JOIN badges b ON b.id = ab.badge_id WHERE ab.account_id = ?`, account.id), [])
      .map((p) => (typeof p === 'string' ? parseJson(p, {}) : p));
    const bonus = Math.max(0, ...perks.map((p) => p.hostLimitBonus ?? 0));
    const cap = Math.min(50, exp.max_players + bonus);
    const max = clamp(maxPlayers ?? exp.max_players, 1, cap);
    const open = db.value("SELECT COUNT(*) FROM larp_sessions WHERE host_account_id = ? AND status != 'ended'", account.id);
    if (open >= 3) throw E.conflict('You are already hosting 3 sessions. End one first.', 'host_limit');
    const t = now();
    const id = db.run(
      `INSERT INTO larp_sessions (experience_id, scenario_id, host_account_id, name, status, privacy, access_code, max_players, settings, created_at)
       VALUES (?, ?, ?, ?, 'lobby', ?, ?, ?, ?, ?)`,
      exp.id, scenario.id, account.id, name || `${account.display_name}'s ${scenario.name}`, privacy, randomCode(6), max,
      toJson({ ...DEFAULT_SESSION_SETTINGS, ...settings }), t,
    ).id;
    this.log(id, 'created', account.id, { scenario: scenario.key });
    this.join(id, account, { characterId, roleId, asHost: true });
    return this.sessionSummary(db.get('SELECT * FROM larp_sessions WHERE id = ?', id), account.id);
  }

  validateRole(rt, roleId, accountId, { byHost = false } = {}) {
    const role = this.roles().get(roleId);
    if (!role) throw E.bad('Unknown role');
    if (!this.enabledRoles(rt.scenario).some((r) => r.id === role.id)) throw E.bad(`${role.name} is not available in ${rt.scenario.name}`);
    if (role.host_only && accountId !== rt.hostId && !byHost) throw E.forbidden(`${role.name} is reserved for the host`);
    if (role.max_per_session) {
      const taken = [...rt.players.values()].filter((p) => p.roleId === role.id && p.accountId !== accountId).length;
      if (taken >= role.max_per_session) throw E.conflict(`The ${role.name} role is full`, 'role_full');
    }
    return role;
  }

  ensureCharacter(account, characterId) {
    const { db } = app;
    if (characterId) {
      const ch = db.get('SELECT * FROM characters WHERE id = ? AND account_id = ?', characterId, account.id);
      if (!ch) throw E.forbidden('That character is not yours');
      return ch.id;
    }
    const last = db.get('SELECT id FROM characters WHERE account_id = ? ORDER BY COALESCE(last_played_at, created_at) DESC LIMIT 1', account.id);
    if (last) return last.id;
    const t = now();
    return db.run('INSERT INTO characters (account_id, name, appearance, stats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      account.id, account.display_name.slice(0, 30), toJson({ useAvatar: true }), toJson({ xp: 0, reputation: 0, sessions: 0 }), t, t).id;
  }

  join(sessionId, account, { characterId, roleId, accessCode, asHost = false, asBot = false, isStaff = false } = {}) {
    const { db } = app;
    const rt = this.runtime(sessionId);
    const existing = db.get('SELECT * FROM session_participants WHERE session_id = ? AND account_id = ?', sessionId, account.id);
    if (existing?.status === 'kicked' && !isStaff) throw E.forbidden('You were removed from this session', 'kicked');
    const already = rt.players.get(account.id);
    if (!asHost && !isStaff && !already && rt.hostId !== account.id) {
      if (rt.privacy === 'private' && accessCode !== rt.accessCode) throw E.forbidden('This session is private. Ask the host for the join code.', 'code_required');
      if (rt.privacy === 'friends' && !areFriends(account.id, rt.hostId) && accessCode !== rt.accessCode) throw E.forbidden('Only friends of the host can join', 'friends_only');
    }
    if (!already) {
      const humans = [...rt.players.values()].filter((p) => !p.isBot).length;
      if (!asBot && humans >= rt.maxPlayers) throw E.conflict('This session is full', 'session_full');
      if (rt.players.size >= 60) throw E.conflict('This session is full', 'session_full');
    }
    const chId = asBot ? (characterId ?? null) : this.ensureCharacter(account, characterId);
    let role;
    if (roleId) role = this.validateRole(rt, roleId, account.id, { byHost: asHost || isStaff });
    else if (already) role = this.roles().get(already.roleId);
    else {
      const ch = chId ? db.get('SELECT favorite_role_id FROM characters WHERE id = ?', chId) : null;
      try { role = ch?.favorite_role_id ? this.validateRole(rt, ch.favorite_role_id, account.id) : null; } catch { role = null; }
      role = role ?? this.defaultRole(rt.scenario);
    }
    const t = now();
    db.tx(() => {
      db.run(
        `INSERT INTO session_participants (session_id, account_id, character_id, role_id, is_host, is_bot, status, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
         ON CONFLICT(session_id, account_id) DO UPDATE SET character_id = excluded.character_id, role_id = excluded.role_id,
           status = 'active', left_at = NULL, is_bot = excluded.is_bot`,
        sessionId, account.id, chId, role.id, asHost ? 1 : 0, asBot ? 1 : 0, t,
      );
      if (!already && !asBot) {
        db.run('UPDATE experiences SET visits = visits + 1 WHERE id = ?', rt.experienceId);
        db.run('INSERT INTO play_history (account_id, experience_id, session_id, started_at) VALUES (?, ?, ?, ?)', account.id, rt.experienceId, sessionId, t);
        if (chId) db.run('UPDATE characters SET last_played_at = ? WHERE id = ?', t, chId);
      }
    });
    if (already) {
      if (already.characterId !== chId && !asBot) {
        this.persistPlayer(rt, already, { final: true });
        rt.players.delete(account.id);
      } else {
        already.roleId = role.id;
        this.broadcast(rt, { type: 'player', player: this.publicPlayer(already) });
        this.sendSelf(rt, already);
        return this.sessionSummary(db.get('SELECT * FROM larp_sessions WHERE id = ?', sessionId), account.id);
      }
    }
    const part = db.get('SELECT * FROM session_participants WHERE session_id = ? AND account_id = ?', sessionId, account.id);
    const p = this.spawnPlayer(rt, part);
    rt.emptySince = null;
    this.log(sessionId, asBot ? 'bot_joined' : 'joined', account.id, { role: role.key, characterId: chId });
    this.broadcast(rt, { type: 'player', player: this.publicPlayer(p) });
    this.system(rt, `${p.name} joined as ${role.name}`);
    return this.sessionSummary(db.get('SELECT * FROM larp_sessions WHERE id = ?', sessionId), account.id);
  }

  leave(sessionId, accountId, { kicked = false, reason = null } = {}) {
    const { db } = app;
    const rt = this.runtime(sessionId);
    const p = rt.players.get(accountId);
    if (p) {
      this.persistPlayer(rt, p, { final: true });
      rt.players.delete(accountId);
      this.broadcast(rt, { type: 'player_left', id: accountId, kicked });
      this.system(rt, kicked ? `${p.name} was removed from the session` : `${p.name} left`);
      for (const c of rt.clients) if (c.accountId === accountId) { this.send(c, { type: kicked ? 'kicked' : 'left', reason }); c.res.end(); }
    }
    db.run(`UPDATE session_participants SET status = ?, left_at = ? WHERE session_id = ? AND account_id = ?`, kicked ? 'kicked' : 'left', now(), sessionId, accountId);
    db.run('UPDATE play_history SET ended_at = ? WHERE account_id = ? AND session_id = ? AND ended_at IS NULL', now(), accountId, sessionId);
    this.log(sessionId, kicked ? 'kicked' : 'left', accountId, reason ? { reason } : {});
    if (rt.hostId === accountId) this.transferHost(rt);
    return { ok: true };
  }

  transferHost(rt) {
    const next = [...rt.players.values()].find((p) => !p.isBot);
    rt.hostId = next?.accountId ?? rt.hostId;
    if (next) {
      app.db.run('UPDATE larp_sessions SET host_account_id = ? WHERE id = ?', next.accountId, rt.id);
      app.db.run('UPDATE session_participants SET is_host = (account_id = ?) WHERE session_id = ?', next.accountId, rt.id);
      this.system(rt, `${next.name} is now the host`);
      this.broadcastStatus(rt);
    }
  }

  isHost(rt, accountId) {
    return rt.hostId === accountId;
  }

  requireHost(rt, ctx) {
    if (ctx.perms?.has('game.manage') && ctx.elevated) return;
    if (!this.isHost(rt, ctx.account.id)) throw E.forbidden('Only the session host can do that', 'not_host');
  }

  control(sessionId, action, actorId) {
    const { db } = app;
    const rt = this.runtime(sessionId);
    const t = now();
    switch (action) {
      case 'start':
        if (rt.status !== 'lobby') throw E.conflict('The session already started');
        rt.status = 'active';
        rt.startedAt = t;
        db.run("UPDATE larp_sessions SET status = 'active', started_at = ? WHERE id = ?", t, rt.id);
        this.banner(rt, `${rt.scenario.name} has begun!`, 'announce', 5);
        break;
      case 'pause':
        if (rt.status !== 'active') throw E.conflict('Only running sessions can be paused');
        rt.status = 'paused';
        for (const p of rt.players.values()) p.input = { x: 0, y: 0 };
        db.run("UPDATE larp_sessions SET status = 'paused' WHERE id = ?", rt.id);
        break;
      case 'resume':
        if (rt.status !== 'paused') throw E.conflict('The session is not paused');
        rt.status = 'active';
        db.run("UPDATE larp_sessions SET status = 'active', started_at = COALESCE(started_at, ?) WHERE id = ?", t, rt.id);
        break;
      case 'end':
        this.endSession(rt, actorId);
        return { status: 'ended', summary: parseJson(db.value('SELECT summary FROM larp_sessions WHERE id = ?', rt.id), null) };
      case 'reset':
        this.resetScenario(rt);
        break;
      default:
        throw E.bad('Unknown control action');
    }
    this.log(rt.id, `control.${action}`, actorId);
    this.broadcastStatus(rt);
    return { status: rt.status };
  }

  resetScenario(rt) {
    rt.pickups.clear();
    rt.effects = {};
    rt.banners = [];
    rt.cityFund = 0;
    rt.elapsedMs = 0;
    rt.nextAuto = {};
    rt.completions = new Set();
    this.seedPickups(rt);
    const startCash = rt.settings.startingCash ?? rt.scenario.config.startingCash ?? 100;
    for (const p of rt.players.values()) {
      const role = this.roles().get(p.roleId);
      p.cash = startCash;
      p.startCash = startCash;
      p.energy = rt.scenario.config.startEnergyByRole?.[role?.key] ?? MAX_ENERGY;
      p.stats = { ...Object.fromEntries(STAT_KEYS.map((k) => [k, 0])), visited: {} };
      p.completed = false;
      p.cooldowns = {};
      const pos = randomFreePoint(this.rand, 'plaza');
      p.x = pos.x;
      p.y = pos.y;
      this.sendSelf(rt, p);
    }
    this.broadcast(rt, { type: 'reset', pickups: [...rt.pickups.values()], players: [...rt.players.values()].map((p) => this.publicPlayer(p)) });
    this.banner(rt, 'The scenario was reset', 'system', 4);
  }

  changeScenario(sessionId, scenarioId, actorId) {
    const rt = this.runtime(sessionId);
    if (rt.status !== 'lobby') throw E.conflict('Change the scenario before the session starts');
    rt.scenario = this.loadScenario(scenarioId);
    app.db.run('UPDATE larp_sessions SET scenario_id = ? WHERE id = ?', rt.scenario.id, rt.id);
    for (const p of rt.players.values()) {
      if (!this.enabledRoles(rt.scenario).some((r) => r.id === p.roleId)) p.roleId = this.defaultRole(rt.scenario).id;
      app.db.run('UPDATE session_participants SET role_id = ? WHERE session_id = ? AND account_id = ?', p.roleId, rt.id, p.accountId);
    }
    this.resetScenario(rt);
    this.log(rt.id, 'scenario_changed', actorId, { scenario: rt.scenario.key });
    this.broadcast(rt, { type: 'scenario', scenario: this.scenarioView(rt) });
    this.broadcastStatus(rt);
    return this.scenarioView(rt);
  }

  updateSettings(sessionId, patch, actorId) {
    const rt = this.runtime(sessionId);
    if (patch.name) rt.name = patch.name;
    if (patch.privacy) rt.privacy = patch.privacy;
    if (patch.maxPlayers) rt.maxPlayers = patch.maxPlayers;
    rt.settings = { ...rt.settings, ...(patch.settings ?? {}) };
    app.db.run('UPDATE larp_sessions SET name = ?, privacy = ?, max_players = ?, settings = ? WHERE id = ?', rt.name, rt.privacy, rt.maxPlayers, toJson(rt.settings), rt.id);
    if (patch.regenerateCode) {
      rt.accessCode = randomCode(6);
      app.db.run('UPDATE larp_sessions SET access_code = ? WHERE id = ?', rt.accessCode, rt.id);
    }
    this.log(rt.id, 'settings', actorId, patch);
    this.broadcastStatus(rt);
    return this.sessionSummary(app.db.get('SELECT * FROM larp_sessions WHERE id = ?', rt.id), actorId, true);
  }

  setRole(sessionId, accountId, roleId, { byHost = false } = {}) {
    const rt = this.runtime(sessionId);
    const p = rt.players.get(accountId);
    if (!p) throw E.notFound('That player is not in this session');
    if (!byHost && !rt.settings.allowRoleSwitch && rt.status !== 'lobby') throw E.forbidden('The host has locked roles');
    const role = this.validateRole(rt, roleId, accountId, { byHost });
    p.roleId = role.id;
    app.db.run('UPDATE session_participants SET role_id = ? WHERE session_id = ? AND account_id = ?', role.id, rt.id, accountId);
    this.broadcast(rt, { type: 'player', player: this.publicPlayer(p) });
    this.sendSelf(rt, p);
    this.system(rt, `${p.name} is now ${role.name}`);
    this.log(rt.id, 'role', accountId, { role: role.key, byHost });
    return this.publicPlayer(p);
  }

  endSession(rt, actorId = null) {
    const { db } = app;
    if (rt.status === 'ended') return;
    const players = [...rt.players.values()];
    const roles = this.roles();
    const top = players.filter((p) => !p.isBot).sort((a, b) => b.stats.earned - a.stats.earned)[0];
    for (const p of players) this.persistPlayer(rt, p, { final: true });
    const participants = db.all('SELECT * FROM session_participants WHERE session_id = ?', rt.id);
    const summary = {
      scenario: { key: rt.scenario.key, name: rt.scenario.name },
      durationMs: rt.elapsedMs,
      endedBy: actorId,
      cityFund: rt.cityFund,
      topEarner: top ? { accountId: top.accountId, name: top.name, earned: top.stats.earned } : null,
      participants: participants.map((pp) => {
        const live = rt.players.get(pp.account_id);
        const st = parseJson(pp.stats, {});
        return {
          accountId: pp.account_id,
          name: live?.name ?? st.name ?? null,
          role: roles.get(pp.role_id)?.name ?? null,
          isBot: Boolean(pp.is_bot),
          earned: live?.stats.earned ?? st.session?.earned ?? 0,
          xp: live?.xp ?? st.xp ?? 0,
          completed: rt.completions.has(pp.account_id),
          status: pp.status,
        };
      }),
    };
    rt.status = 'ended';
    db.tx(() => {
      db.run("UPDATE larp_sessions SET status = 'ended', ended_at = ?, summary = ?, state = NULL WHERE id = ?", now(), toJson(summary), rt.id);
      db.run("UPDATE session_participants SET status = 'left', left_at = COALESCE(left_at, ?) WHERE session_id = ? AND status = 'active'", now(), rt.id);
      db.run('UPDATE play_history SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL', now(), rt.id);
    });
    this.log(rt.id, 'ended', actorId, { durationMs: rt.elapsedMs });
    this.broadcast(rt, { type: 'ended', summary });
    for (const c of rt.clients) c.res.end();
    rt.clients.clear();
    this.sessions.delete(rt.id);
  }

  // ───────────────────────── Persistence ─────────────────────────

  persistPlayer(rt, p, { final }) {
    const { db } = app;
    const sessionStats = { ...p.stats };
    db.run('UPDATE session_participants SET stats = ? WHERE session_id = ? AND account_id = ?',
      toJson({ session: sessionStats, name: p.name, cash: p.cash, xp: p.xp }), rt.id, p.accountId);
    if (!p.characterId || p.isBot) return;
    const ch = db.get('SELECT * FROM characters WHERE id = ?', p.characterId);
    if (!ch) return;
    const stats = parseJson(ch.stats, {});
    const next = { ...stats, xp: p.xp, level: levelFor(p.xp), reputation: p.reputation };
    let deposit = 0;
    if (final && !p.deposited) {
      deposit = Math.max(0, p.cash - p.startCash);
      p.deposited = true;
      next.sessions = (stats.sessions ?? 0) + 1;
      next.totalEarned = (stats.totalEarned ?? 0) + p.stats.earned;
    }
    db.tx(() => {
      db.run('UPDATE characters SET stats = ?, cash = cash + ?, updated_at = ?, last_played_at = ? WHERE id = ?', toJson(next), deposit, now(), now(), p.characterId);
      for (const [itemId, qty] of p.inventory) {
        db.run(`INSERT INTO character_inventory (character_id, game_item_id, quantity) VALUES (?, ?, ?)
                ON CONFLICT(character_id, game_item_id) DO UPDATE SET quantity = excluded.quantity`, p.characterId, itemId, qty);
      }
      db.run('DELETE FROM character_inventory WHERE character_id = ? AND quantity = 0', p.characterId);
    });
  }

  persistState(rt) {
    const players = {};
    for (const p of rt.players.values()) {
      players[p.accountId] = { x: Math.round(p.x), y: Math.round(p.y), cash: p.cash, startCash: p.startCash, energy: p.energy, xp: p.xp, reputation: p.reputation, stats: p.stats };
    }
    const state = {
      pickups: [...rt.pickups.values()], nextPickupId: rt.nextPickupId, cityFund: rt.cityFund, elapsedMs: rt.elapsedMs,
      chat: rt.chat.slice(-40), feed: rt.feed.slice(-30), players, completions: [...rt.completions],
    };
    app.db.run('UPDATE larp_sessions SET state = ? WHERE id = ?', toJson(state), rt.id);
    rt.lastPersist = now();
  }

  persistAll(final) {
    for (const rt of this.sessions.values()) {
      if (rt.status === 'ended') continue;
      this.persistState(rt);
      if (final) for (const p of rt.players.values()) this.persistPlayer(rt, p, { final: false });
    }
  }

  log(sessionId, kind, actorId = null, payload = {}) {
    app.db.run('INSERT INTO session_log (session_id, kind, actor_account_id, payload, created_at) VALUES (?, ?, ?, ?, ?)', sessionId, kind, actorId, toJson(payload), now());
  }

  // ───────────────────────── Views & messaging ─────────────────────────

  publicPlayer(p) {
    const role = this.roles().get(p.roleId);
    return {
      id: p.accountId, name: p.name, username: p.username, roleId: p.roleId, roleKey: role?.key, roleName: role?.name, roleColor: role?.color,
      x: Math.round(p.x), y: Math.round(p.y), facing: p.facing, look: p.look, level: levelFor(p.xp), isBot: p.isBot,
      emote: p.emote, bubble: p.bubble, connected: p.connected > 0 || p.isBot, completed: p.completed,
    };
  }

  objectivesFor(rt, p) {
    const role = this.roles().get(p.roleId);
    return (rt.scenario.config.objectives ?? [])
      .filter((o) => !o.roles || o.roles.includes(role?.key))
      .map((o, i) => {
        const progress = o.type === 'visit' ? (p.stats.visited?.[o.zone] ? 1 : 0) : (p.stats[OBJECTIVE_STAT[o.type]] ?? 0);
        const target = o.type === 'visit' ? 1 : o.target ?? 1;
        return { key: o.key ?? `${o.type}_${i}`, label: o.label ?? `${o.type} ${target}`, type: o.type, target, progress: Math.min(progress, target), done: progress >= target };
      });
  }

  selfView(rt, p) {
    return {
      cash: p.cash, energy: Math.round(p.energy), xp: p.xp, level: levelFor(p.xp), reputation: p.reputation, roleId: p.roleId,
      inventory: [...p.inventory].filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })),
      objectives: this.objectivesFor(rt, p), stats: p.stats, completed: p.completed, cityFund: rt.cityFund,
      cooldowns: Object.fromEntries(Object.entries(p.cooldowns).filter(([, t]) => t > now())),
    };
  }

  scenarioView(rt) {
    const c = rt.scenario.config;
    return {
      id: rt.scenario.id, key: rt.scenario.key, name: rt.scenario.name, description: rt.scenario.description,
      lighting: c.lighting ?? 'day', timeLimitMinutes: rt.settings.timeLimitMinutes ?? c.timeLimitMinutes ?? null,
      roles: this.enabledRoles(rt.scenario).map((r) => r.id), objectives: c.objectives ?? [], completionReward: c.completionReward ?? null,
    };
  }

  statusView(rt) {
    return {
      type: 'status', status: rt.status, hostId: rt.hostId, name: rt.name, privacy: rt.privacy, maxPlayers: rt.maxPlayers,
      settings: rt.settings, elapsedMs: rt.elapsedMs, effects: this.effectsView(rt), cityFund: rt.cityFund,
    };
  }

  effectsView(rt) {
    const t = now();
    const out = {};
    for (const [k, e] of Object.entries(rt.effects)) if (!e.until || e.until > t) out[k] = e;
    return out;
  }

  initPayload(rt, accountId) {
    const p = rt.players.get(accountId);
    return {
      ...this.statusView(rt),
      type: 'init',
      you: accountId,
      session: { id: rt.id, name: rt.name, experienceId: rt.experienceId, experienceName: rt.experienceName, accessCode: rt.hostId === accountId ? rt.accessCode : undefined },
      world: WORLD,
      roles: this.roleList(),
      gameItems: this.itemList(),
      scenario: this.scenarioView(rt),
      players: [...rt.players.values()].map((x) => this.publicPlayer(x)),
      pickups: [...rt.pickups.values()],
      chat: rt.chat.slice(-40),
      feed: rt.feed.slice(-20),
      banners: rt.banners.filter((b) => b.until > now()),
      self: p ? this.selfView(rt, p) : null,
      emotes: this.emotesFor(accountId),
    };
  }

  emotesFor(accountId) {
    const owned = app.db.all(
      `SELECT i.asset FROM avatar_equipped ae JOIN items i ON i.id = ae.item_id WHERE ae.account_id = ? AND ae.slot = 'emote'`, accountId)
      .map((r) => parseJson(r.asset, {}).style).filter(Boolean);
    return [...new Set([...DEFAULT_EMOTES, ...owned])];
  }

  send(client, msg) {
    if (client.res.writableEnded) return;
    if (client.res.writableLength > 1_000_000) { client.res.end(); return; }
    client.res.write(`data: ${JSON.stringify(msg)}\n\n`);
  }

  broadcast(rt, msg) {
    const data = `data: ${JSON.stringify(msg)}\n\n`;
    for (const c of rt.clients) {
      if (c.res.writableEnded) continue;
      if (c.res.writableLength > 1_000_000) { c.res.end(); continue; }
      c.res.write(data);
    }
  }

  sendSelf(rt, p) {
    const msg = { type: 'self', self: this.selfView(rt, p) };
    for (const c of rt.clients) if (c.accountId === p.accountId) this.send(c, msg);
  }

  broadcastStatus(rt) {
    this.broadcast(rt, this.statusView(rt));
  }

  system(rt, text) {
    const m = { id: `${now()}-${Math.floor(this.rand() * 1e6)}`, kind: 'system', text, at: now() };
    rt.chat.push(m);
    if (rt.chat.length > 80) rt.chat.splice(0, rt.chat.length - 80);
    this.broadcast(rt, { type: 'chat', message: m });
  }

  feedItem(rt, text, icon = 'spark') {
    const f = { text, icon, at: now() };
    rt.feed.push(f);
    if (rt.feed.length > 40) rt.feed.splice(0, rt.feed.length - 40);
    this.broadcast(rt, { type: 'feed', item: f });
  }

  banner(rt, text, kind = 'announce', seconds = 6) {
    const b = { id: `${now()}-${Math.floor(this.rand() * 1e6)}`, text: String(text).slice(0, 120), kind, until: now() + seconds * 1000 };
    rt.banners = [...rt.banners.filter((x) => x.until > now()), b].slice(-4);
    this.broadcast(rt, { type: 'banner', banner: b });
  }

  attachStream(sessionId, accountId, res) {
    const rt = this.runtime(sessionId);
    const p = rt.players.get(accountId);
    if (!p) throw E.forbidden('Join the session first', 'not_participant');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    const client = { accountId, res };
    rt.clients.add(client);
    p.connected++;
    p.lastActive = now();
    if (p.connected === 1) this.broadcast(rt, { type: 'player', player: this.publicPlayer(p) });
    this.send(client, this.initPayload(rt, accountId));
    res.on('close', () => {
      rt.clients.delete(client);
      const pl = rt.players.get(accountId);
      if (pl) {
        pl.connected = Math.max(0, pl.connected - 1);
        pl.input = pl.connected ? pl.input : { x: 0, y: 0 };
        pl.lastActive = now();
        if (!pl.connected) this.broadcast(rt, { type: 'player', player: this.publicPlayer(pl) });
      }
    });
  }

  heartbeat() {
    for (const rt of this.sessions.values()) for (const c of rt.clients) if (!c.res.writableEnded) c.res.write(': ping\n\n');
  }

  // ───────────────────────── Player input & actions ─────────────────────────

  input(sessionId, accountId, x, y) {
    const rt = this.runtime(sessionId);
    const p = rt.players.get(accountId);
    if (!p) throw E.forbidden('Join the session first', 'not_participant');
    const len = Math.hypot(x, y);
    const k = len > 1 ? 1 / len : 1;
    p.input = { x: x * k, y: y * k };
    if (x) p.facing = x > 0 ? 1 : -1;
    p.lastInputAt = now();
    p.lastActive = now();
    return { ok: true };
  }

  requirePlayer(rt, accountId) {
    const p = rt.players.get(accountId);
    if (!p) throw E.forbidden('Join the session first', 'not_participant');
    return p;
  }

  cooldown(p, key, ms) {
    const t = now();
    if ((p.cooldowns[key] ?? 0) > t) throw E.conflict('Wait a moment before doing that again', 'cooldown', { readyAt: p.cooldowns[key] });
    p.cooldowns[key] = t + ms;
  }

  nearby(rt, p, targetId) {
    const target = rt.players.get(targetId);
    if (!target || target === p) throw E.bad('Pick another player');
    if (dist(p, target) > RANGE) throw E.conflict(`Move closer to ${target.name}`, 'too_far');
    return target;
  }

  earn(rt, p, amount, reason) {
    if (amount <= 0) return;
    p.cash += amount;
    p.stats.earned += amount;
    if (reason) this.sendSelf(rt, p);
  }

  gainXp(rt, p, xp) {
    const before = levelFor(p.xp);
    p.xp += xp;
    const after = levelFor(p.xp);
    if (after > before) {
      this.feedItem(rt, `${p.name} reached level ${after}!`, 'level');
      this.broadcast(rt, { type: 'player', player: this.publicPlayer(p) });
    }
  }

  hasPerm(p, perm) {
    return this.roles().get(p.roleId)?.permissions.includes(perm) ?? false;
  }

  priceOf(rt, item) {
    const sale = rt.effects.sale && rt.effects.sale.until > now() ? rt.effects.sale.multiplier : 1;
    return Math.max(0, Math.round(item.price * sale * (rt.scenario.config.priceMultiplier ?? 1)));
  }

  action(sessionId, accountId, body) {
    const rt = this.runtime(sessionId);
    const p = this.requirePlayer(rt, accountId);
    p.lastActive = now();
    const type = body.type;
    if (type === 'emote') return this.doEmote(rt, p, body.emote);
    if (rt.status !== 'active') throw E.conflict(rt.status === 'lobby' ? 'Waiting for the host to start the session' : 'The session is paused', 'not_active');
    const role = this.roles().get(p.roleId);
    let result;
    switch (type) {
      case 'work': {
        if (!role.work_zone) throw E.bad(`${role.name} has no workplace`);
        const z = zoneByKey(role.work_zone);
        if (!inZone(p, role.work_zone)) throw E.conflict(`Go to ${z?.name ?? role.work_zone} to work`, 'wrong_place');
        if (p.energy < WORK_COST) throw E.conflict('Too tired to work. Grab a coffee or visit a medic.', 'no_energy');
        this.cooldown(p, 'work', 2500);
        const pay = Math.round(role.salary * (rt.scenario.config.salaryMultiplier ?? 1));
        p.energy -= WORK_COST;
        p.stats.shifts++;
        this.earn(rt, p, pay);
        this.gainXp(rt, p, 6);
        if (p.stats.shifts % 5 === 0) this.feedItem(rt, `${p.name} finished ${p.stats.shifts} shifts at ${z.name}`, 'work');
        result = { earned: pay };
        break;
      }
      case 'buy': {
        const item = this.gameItems().get(Number(body.itemId));
        if (!item) throw E.bad('Unknown item');
        if (item.sold_in && !inZone(p, item.sold_in)) throw E.conflict(`${item.name} is sold at ${zoneByKey(item.sold_in)?.name ?? item.sold_in}`, 'wrong_place');
        const price = this.priceOf(rt, item);
        if (p.cash < price) throw E.conflict(`You need $${price} for ${item.name}`, 'insufficient_cash');
        this.cooldown(p, 'buy', 600);
        p.cash -= price;
        p.inventory.set(item.id, (p.inventory.get(item.id) ?? 0) + 1);
        p.stats.purchases++;
        // A shopkeeper on duty at that shop gets a commission paid by the city.
        const clerk = [...rt.players.values()].find((o) => o !== p && this.roles().get(o.roleId)?.work_zone === item.sold_in && this.hasPerm(o, 'sell') && inZone(o, item.sold_in));
        if (clerk) {
          const commission = Math.max(1, Math.round(price * 0.25));
          this.earn(rt, clerk, commission, 'commission');
          this.gainXp(rt, clerk, 3);
        }
        result = { item: item.key, price, clerk: clerk?.name ?? null };
        break;
      }
      case 'use': {
        const item = this.gameItems().get(Number(body.itemId));
        if (!item || !(p.inventory.get(item.id) > 0)) throw E.bad('You do not have that item');
        this.cooldown(p, 'use', 800);
        const eff = item.effect;
        p.inventory.set(item.id, p.inventory.get(item.id) - 1);
        if (eff.energy) p.energy = Math.min(MAX_ENERGY, p.energy + eff.energy);
        if (eff.xp) this.gainXp(rt, p, eff.xp);
        if (eff.reputation) p.reputation += eff.reputation;
        if (eff.emote) this.setEmote(rt, p, eff.emote);
        result = { used: item.key };
        break;
      }
      case 'give_cash': {
        const target = this.nearby(rt, p, Number(body.targetId));
        const amount = Math.floor(Number(body.amount));
        if (!Number.isInteger(amount) || amount <= 0) throw E.bad('Enter an amount');
        if (amount > p.cash) throw E.conflict('You do not have that much cash', 'insufficient_cash');
        p.cash -= amount;
        target.cash += amount;
        p.stats.gifts++;
        this.sendSelf(rt, target);
        this.feedItem(rt, `${p.name} gave $${amount} to ${target.name}`, 'cash');
        result = { amount };
        break;
      }
      case 'give_item': {
        const target = this.nearby(rt, p, Number(body.targetId));
        const item = this.gameItems().get(Number(body.itemId));
        if (!item || !(p.inventory.get(item.id) > 0)) throw E.bad('You do not have that item');
        p.inventory.set(item.id, p.inventory.get(item.id) - 1);
        target.inventory.set(item.id, (target.inventory.get(item.id) ?? 0) + 1);
        p.stats.gifts++;
        if (item.effect.giftReputation) p.reputation += item.effect.giftReputation;
        this.sendSelf(rt, target);
        this.feedItem(rt, `${p.name} gave ${item.name} to ${target.name}`, 'gift');
        result = { item: item.key };
        break;
      }
      case 'heal': {
        if (!this.hasPerm(p, 'heal')) throw E.forbidden('Only medics can heal');
        const target = this.nearby(rt, p, Number(body.targetId));
        if (target.energy >= MAX_ENERGY - 5) throw E.conflict(`${target.name} is already feeling great`, 'not_needed');
        this.cooldown(p, 'heal', 4000);
        target.energy = MAX_ENERGY;
        p.stats.heals++;
        this.earn(rt, p, role.salary);
        this.gainXp(rt, p, 12);
        p.reputation += 1;
        this.sendSelf(rt, target);
        this.feedItem(rt, `${p.name} treated ${target.name}`, 'heal');
        result = { healed: target.accountId };
        break;
      }
      case 'cite': {
        if (!this.hasPerm(p, 'cite')) throw E.forbidden('Only police officers can write citations');
        const target = this.nearby(rt, p, Number(body.targetId));
        this.cooldown(p, 'cite', 10_000);
        const fine = Math.min(target.cash, rt.scenario.config.fine ?? 25);
        target.cash -= fine;
        rt.cityFund += fine;
        p.stats.citations++;
        this.earn(rt, p, Math.round(role.salary / 2));
        this.gainXp(rt, p, 8);
        this.sendSelf(rt, target);
        const reason = String(body.reason ?? 'disturbing the peace').slice(0, 60);
        this.feedItem(rt, `${p.name} cited ${target.name} for ${reason} ($${fine} fine)`, 'shield');
        result = { fine };
        break;
      }
      case 'interview': {
        if (!this.hasPerm(p, 'interview')) throw E.forbidden('Only reporters can interview');
        const target = this.nearby(rt, p, Number(body.targetId));
        this.cooldown(p, 'interview', 8000);
        p.stats.interviews++;
        p.reputation += 2;
        target.reputation += 2;
        this.earn(rt, p, role.salary);
        this.gainXp(rt, p, 10);
        this.gainXp(rt, target, 5);
        this.sendSelf(rt, target);
        this.feedItem(rt, `${p.name} interviewed ${target.name} for LVN News`, 'mic');
        result = { interviewed: target.accountId };
        break;
      }
      case 'broadcast':
      case 'announce': {
        const perm = type === 'broadcast' ? 'broadcast' : 'announce';
        if (!this.hasPerm(p, perm)) throw E.forbidden(type === 'broadcast' ? 'Only reporters can broadcast news' : 'Only the mayor or director can make announcements');
        const text = String(body.text ?? '').trim().slice(0, 100);
        if (!text) throw E.bad('Write a headline');
        this.cooldown(p, type, 15_000);
        if (type === 'broadcast') { p.stats.broadcasts++; this.gainXp(rt, p, 8); }
        this.banner(rt, type === 'broadcast' ? `BREAKING: ${text}` : `${role.name} ${p.name}: ${text}`, type === 'broadcast' ? 'news' : 'announce', 8);
        result = { text };
        break;
      }
      case 'grant_bonus': {
        if (!this.hasPerm(p, 'grant_bonus')) throw E.forbidden('Only the mayor can hand out city bonuses');
        const others = [...rt.players.values()].filter((o) => o !== p);
        if (rt.cityFund < others.length || others.length === 0) throw E.conflict('The city fund is too low', 'fund_low');
        this.cooldown(p, 'grant_bonus', 20_000);
        const each = Math.floor(rt.cityFund / others.length);
        rt.cityFund -= each * others.length;
        for (const o of others) { o.cash += each; this.sendSelf(rt, o); }
        this.banner(rt, `Mayor ${p.name} paid every citizen a $${each} city bonus!`, 'announce', 6);
        result = { each };
        break;
      }
      case 'perform': {
        if (!this.hasPerm(p, 'perform')) throw E.forbidden('Only performers can perform');
        if (!inZone(p, 'stage')) throw E.conflict('Head to the Grand Stage to perform', 'wrong_place');
        if (p.energy < WORK_COST) throw E.conflict('Too tired to perform', 'no_energy');
        this.cooldown(p, 'perform', 6000);
        const audience = [...rt.players.values()].filter((o) => o !== p && inZone(o, 'stage')).length;
        const tips = role.salary + audience * 8;
        p.energy -= WORK_COST;
        p.stats.performances++;
        this.earn(rt, p, tips);
        this.gainXp(rt, p, 8 + audience * 2);
        p.reputation += audience;
        this.setEmote(rt, p, 'dance');
        this.feedItem(rt, `${p.name} performed for ${audience} fan${audience === 1 ? '' : 's'} and earned $${tips} in tips`, 'music');
        result = { tips, audience };
        break;
      }
      default:
        throw E.bad('Unknown action');
    }
    this.checkObjectives(rt, p);
    this.sendSelf(rt, p);
    return { ok: true, ...result, self: this.selfView(rt, p) };
  }

  doEmote(rt, p, key) {
    if (!this.emotesFor(p.accountId).includes(key)) throw E.forbidden('Equip that emote on your avatar first');
    this.cooldown(p, 'emote', 1000);
    this.setEmote(rt, p, key);
    return { ok: true };
  }

  setEmote(rt, p, key) {
    p.emote = { key, until: now() + 3000 };
    this.broadcast(rt, { type: 'emote', id: p.accountId, emote: p.emote });
  }

  chat(sessionId, accountId, text) {
    const rt = this.runtime(sessionId);
    const p = this.requirePlayer(rt, accountId);
    if (!rt.settings.chatEnabled && rt.hostId !== accountId) throw E.forbidden('The host turned chat off');
    const clean = String(text ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 200);
    if (!clean) throw E.bad('Message is empty');
    this.cooldown(p, 'chat', 700);
    return this.say(rt, p, clean);
  }

  say(rt, p, text) {
    const role = this.roles().get(p.roleId);
    const m = { id: `${now()}-${p.accountId}`, kind: 'chat', from: p.accountId, name: p.name, roleColor: role?.color, text, at: now() };
    rt.chat.push(m);
    if (rt.chat.length > 80) rt.chat.splice(0, rt.chat.length - 80);
    p.bubble = { text: text.slice(0, 80), until: now() + 5000 };
    p.stats.chats++;
    this.broadcast(rt, { type: 'chat', message: m });
    this.broadcast(rt, { type: 'bubble', id: p.accountId, bubble: p.bubble });
    this.checkObjectives(rt, p);
    if (!p.isBot) this.sendSelf(rt, p);
    return { ok: true, message: m };
  }

  checkObjectives(rt, p) {
    if (p.completed || p.isBot) return;
    const objs = this.objectivesFor(rt, p);
    if (objs.length === 0 || !objs.every((o) => o.done)) return;
    p.completed = true;
    rt.completions.add(p.accountId);
    this.gainXp(rt, p, 50);
    const reward = rt.scenario.config.completionReward ?? getConfig('economy').sessionCompletionReward;
    this.feedItem(rt, `${p.name} completed every objective in ${rt.scenario.name}!`, 'trophy');
    this.broadcast(rt, { type: 'player', player: this.publicPlayer(p) });
    if (reward > 0) {
      try {
        app.db.tx(() => {
          credit(p.accountId, reward, { type: 'game_reward', description: `Completed ${rt.scenario.name} in ${rt.experienceName}`, refType: 'session', refId: rt.id });
          notify(p.accountId, { type: 'reward', title: `+${reward} Sparks for completing ${rt.scenario.name}`, body: 'Roleplay reward (fictional currency).', data: { sessionId: rt.id } });
        });
      } catch (e) {
        app.log('completion reward failed', e.message);
      }
    }
    this.log(rt.id, 'objectives_completed', p.accountId, { reward });
  }

  // ───────────────────────── Scripted game events ─────────────────────────

  triggerEvent(sessionId, type, params = {}, actor = {}) {
    const rt = this.runtime(sessionId);
    if (!GAME_EVENT_TYPES.includes(type)) throw E.bad('Unknown game event');
    const t = now();
    const secs = (d) => clamp(Number(params.durationSeconds ?? d) || d, 3, 3600);
    const result = { type };
    switch (type) {
      case 'coin_rain': {
        const count = clamp(Number(params.count ?? 25) || 25, 1, 120);
        const added = [];
        const zones = ['plaza', 'park', 'stage'];
        for (let i = 0; i < count; i++) added.push(this.addPickup(rt, 'spark', zones[i % zones.length], params.value ?? null));
        rt.effects.rain = { kind: 'coins', until: t + secs(20) * 1000 };
        this.broadcast(rt, { type: 'pickups', add: added });
        this.banner(rt, params.text ?? 'Spark shower! Collect the sparks around the city!', 'event', 6);
        result.spawned = count;
        break;
      }
      case 'market_sale': {
        const multiplier = clamp(Number(params.multiplier ?? 0.5) || 0.5, 0.05, 2);
        rt.effects.sale = { multiplier, until: t + secs(90) * 1000 };
        this.banner(rt, params.text ?? `Flash sale! Everything is ${Math.round((1 - multiplier) * 100)}% off`, 'event', 8);
        break;
      }
      case 'breaking_news':
        this.banner(rt, `BREAKING: ${String(params.text ?? 'Something big is happening downtown!').slice(0, 100)}`, 'news', secs(10));
        break;
      case 'announcement':
        this.banner(rt, String(params.text ?? 'Attention, citizens!').slice(0, 110), 'announce', secs(8));
        break;
      case 'blackout':
        rt.effects.blackout = { until: t + secs(40) * 1000 };
        this.banner(rt, params.text ?? 'Power outage! The city went dark…', 'event', 6);
        break;
      case 'weather_rain':
        rt.effects.weather = { kind: 'rain', until: t + secs(60) * 1000 };
        break;
      case 'spotlight': {
        const target = rt.players.get(Number(params.accountId)) ?? [...rt.players.values()][0];
        if (target) rt.effects.spotlight = { accountId: target.accountId, until: t + secs(15) * 1000 };
        break;
      }
      case 'cash_bonus': {
        const amount = clamp(Number(params.amount ?? 50) || 50, 1, 100000);
        for (const p of rt.players.values()) { this.earn(rt, p, amount); this.sendSelf(rt, p); }
        this.banner(rt, params.text ?? `Everyone received a $${amount} bonus!`, 'event', 6);
        break;
      }
      case 'clue_hunt': {
        const count = clamp(Number(params.count ?? 5) || 5, 1, 30);
        const added = [];
        for (let i = 0; i < count; i++) added.push(this.addPickup(rt, 'clue'));
        this.broadcast(rt, { type: 'pickups', add: added });
        this.banner(rt, params.text ?? 'New clues have appeared inside the buildings…', 'event', 6);
        result.spawned = count;
        break;
      }
      case 'award_ceremony': {
        const humans = [...rt.players.values()].filter((p) => !p.isBot || params.allowBots);
        let winner = null;
        if (params.winnerAccountId) winner = rt.players.get(Number(params.winnerAccountId));
        else if (params.winner === 'random') winner = humans[Math.floor(this.rand() * humans.length)];
        else winner = humans.sort((a, b) => b.stats.earned + b.reputation * 5 - (a.stats.earned + a.reputation * 5))[0];
        if (!winner) throw E.conflict('Nobody is here to receive the award');
        const title = String(params.title ?? 'Star of the Night').slice(0, 60);
        rt.effects.spotlight = { accountId: winner.accountId, until: t + secs(15) * 1000, title };
        this.setEmote(rt, winner, 'cheer');
        this.banner(rt, `🏆 ${winner.name} wins "${title}"!`, 'award', secs(12));
        const rewards = [];
        app.db.tx(() => {
          const sparks = Math.max(0, Math.floor(Number(params.rewardSparks ?? 0)));
          if (sparks > 0) { credit(winner.accountId, sparks, { type: 'event_reward', description: `Award: ${title}`, refType: 'session', refId: rt.id, scripted: true }); rewards.push(`${sparks} Sparks`); }
          if (params.rewardItemSku) {
            const item = app.db.get('SELECT id, name FROM items WHERE sku = ?', params.rewardItemSku);
            if (item && grantItem(winner.accountId, item.id, { source: 'reward', sourceRef: rt.id, allowSoldOut: true }).length) rewards.push(item.name);
          }
          if (params.badgeKey) {
            try { assignBadge(winner.accountId, String(params.badgeKey), { userId: actor.userId ?? null }); rewards.push('a badge'); } catch { /* badge unavailable */ }
          }
          notify(winner.accountId, {
            type: 'reward', title: `You won "${title}" in ${rt.experienceName}!`,
            body: rewards.length ? `Rewards: ${rewards.join(', ')} (roleplay rewards).` : 'Congratulations!', data: { sessionId: rt.id }, scripted: true,
          });
        });
        this.gainXp(rt, winner, 40);
        winner.reputation += 10;
        this.sendSelf(rt, winner);
        result.winner = { accountId: winner.accountId, name: winner.name, rewards };
        break;
      }
      default:
        break;
    }
    this.broadcastStatus(rt);
    this.log(rt.id, 'event', actor.accountId ?? null, { type, params });
    return result;
  }

  addBot(sessionId, account, { roleId } = {}) {
    const rt = this.runtime(sessionId);
    if (!account.is_fictional) throw E.bad('Only fictional accounts can be added as roleplay extras');
    return this.join(sessionId, account, { roleId, asBot: true, isStaff: true });
  }

  // ───────────────────────── Simulation ─────────────────────────

  tick(dt) {
    const t = now();
    for (const rt of this.sessions.values()) {
      if (rt.status === 'ended') continue;
      const moving = rt.status === 'active' || rt.status === 'lobby';
      if (rt.status === 'active') {
        rt.elapsedMs += dt * 1000;
        this.runAutoEvents(rt);
        const limit = rt.settings.timeLimitMinutes ?? rt.scenario.config.timeLimitMinutes;
        if (limit && rt.elapsedMs >= limit * 60_000) {
          this.endSession(rt, null);
          continue;
        }
      }
      let humans = 0;
      for (const p of rt.players.values()) {
        if (!p.isBot) humans++;
        if (p.isBot && moving) this.botThink(rt, p, t);
        if (moving && (p.input.x || p.input.y)) {
          const bx = p.x;
          const by = p.y;
          moveWithCollision(p, p.input.x * SPEED * dt, p.input.y * SPEED * dt);
          p.moving = p.x !== bx || p.y !== by;
        } else {
          p.moving = false;
        }
        // Idle humans with no stream for 5 minutes are removed.
        if (!p.isBot && p.connected === 0 && t - p.lastActive > 5 * 60_000) {
          this.leave(rt.id, p.accountId, { reason: 'idle' });
          continue;
        }
        if (rt.status === 'active') {
          p.energy = Math.min(MAX_ENERGY, p.energy + dt * 0.35);
          const z = zoneAt(p.x, p.y);
          if (z && !p.stats.visited[z.key]) { p.stats.visited[z.key] = true; this.checkObjectives(rt, p); if (!p.isBot) this.sendSelf(rt, p); }
          this.collectPickups(rt, p);
        }
        if (p.emote && p.emote.until < t) p.emote = null;
        if (p.bubble && p.bubble.until < t) p.bubble = null;
      }
      if (humans === 0) {
        rt.emptySince = rt.emptySince ?? t;
        if (t - rt.emptySince > 90_000) this.endSession(rt, null);
      } else {
        rt.emptySince = null;
      }
    }
  }

  collectPickups(rt, p) {
    for (const pk of rt.pickups.values()) {
      if (Math.abs(pk.x - p.x) > 30 || Math.abs(pk.y - p.y) > 30) continue;
      if (dist(pk, p) > 30) continue;
      rt.pickups.delete(pk.id);
      if (pk.type === 'spark') { p.stats.pickups++; this.earn(rt, p, pk.value); }
      if (pk.type === 'clue') {
        p.stats.clues++;
        this.gainXp(rt, p, 15);
        if (this.hasPerm(p, 'cite')) this.earn(rt, p, 20);
        this.feedItem(rt, `${p.name} found a clue (${p.stats.clues})`, 'search');
      }
      this.broadcast(rt, { type: 'pickups', remove: [pk.id], by: p.accountId });
      this.checkObjectives(rt, p);
      if (!p.isBot) this.sendSelf(rt, p);
      // Keep the city stocked with a few sparks.
      const sparks = [...rt.pickups.values()].filter((x) => x.type === 'spark').length;
      if (sparks < (rt.scenario.config.minPickups ?? 6)) this.broadcast(rt, { type: 'pickups', add: [this.addPickup(rt, 'spark')] });
    }
  }

  runAutoEvents(rt) {
    const list = rt.scenario.config.autoEvents ?? [];
    list.forEach((ev, i) => {
      const every = (ev.everySeconds ?? 180) * 1000;
      const due = rt.nextAuto[i] ?? every;
      if (rt.elapsedMs >= due) {
        rt.nextAuto[i] = rt.elapsedMs + every;
        try { this.triggerEvent(rt.id, ev.type, ev.params ?? {}, {}); } catch (e) { app.log('auto event failed', e.message); }
      }
    });
  }

  botThink(rt, p, t) {
    const b = p.bot;
    if (b.route.length) {
      const wp = b.route[0];
      const dx = wp.x - p.x;
      const dy = wp.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 18) {
        b.route.shift();
        if (!b.route.length) p.input = { x: 0, y: 0 };
      } else {
        p.input = { x: (dx / d) * 0.7, y: (dy / d) * 0.7 };
        if (dx) p.facing = dx > 0 ? 1 : -1;
      }
      if (t > b.next + 15_000) { b.route = []; p.input = { x: 0, y: 0 }; } // stuck: re-plan
    } else if (t >= b.next) {
      const role = this.roles().get(p.roleId);
      const goWork = role?.work_zone && this.rand() < 0.55;
      const target = goWork ? { ...zoneByKey(role.work_zone).station } : randomFreePoint(this.rand);
      target.x += (this.rand() - 0.5) * 60;
      target.y += (this.rand() - 0.5) * 40;
      b.route = routeTo(p, target);
      b.next = t + 4000 + this.rand() * 6000;
    }
    if (rt.status === 'active') {
      const role = this.roles().get(p.roleId);
      if (role?.work_zone && inZone(p, role.work_zone) && t > b.nextWork && p.energy >= WORK_COST) {
        b.nextWork = t + 5000 + this.rand() * 4000;
        p.energy -= WORK_COST;
        p.stats.shifts++;
        this.earn(rt, p, role.salary);
      }
    }
    if (t > b.nextLine) {
      b.nextLine = t + 18_000 + this.rand() * 25_000;
      const lines = rt.scenario.config.botLines ?? BOT_LINES;
      if (this.rand() < 0.6) this.say(rt, p, lines[Math.floor(this.rand() * lines.length)]);
      else this.setEmote(rt, p, DEFAULT_EMOTES[Math.floor(this.rand() * DEFAULT_EMOTES.length)]);
    }
  }

  broadcastTicks() {
    for (const rt of this.sessions.values()) {
      if (rt.clients.size === 0) continue;
      const players = [];
      for (const p of rt.players.values()) players.push([p.accountId, Math.round(p.x), Math.round(p.y), p.facing, p.moving ? 1 : 0]);
      this.broadcast(rt, { type: 'tick', t: now(), s: rt.status, e: Math.round(rt.elapsedMs), p: players });
    }
  }
}
