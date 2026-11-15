import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E, HANDLED } from '../http.js';
import { GAME_EVENT_TYPES, lookFromAvatar } from '../game/engine.js';
import { WORLD } from '../game/world.js';
import { areFriends, settingsOf } from '../services/accounts.js';
import { avatarSpecs } from '../services/avatar.js';
import { notify } from '../services/notify.js';
import { now, page, paginate, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';

const colorOpt = () => v.color().optional();
export const lookSchema = v.object({
  skin: colorOpt(), shirt: colorOpt(), pants: colorOpt(),
  hair: v.object({ style: v.string({ max: 20 }), color: v.color() }).nullable().optional(),
  hat: v.object({ style: v.string({ max: 20 }), color: v.color() }).nullable().optional(),
});

export const settingsSchema = v.object({
  allowRoleSwitch: v.bool().optional(),
  chatEnabled: v.bool().optional(),
  hostEvents: v.bool().optional(),
  allowBots: v.bool().optional(),
  startingCash: v.int({ min: 0, max: 100000 }).nullable().optional(),
  timeLimitMinutes: v.int({ min: 1, max: 600 }).nullable().optional(),
}, { strict: true });

function characterView(c) {
  const stats = parseJson(c.stats, {});
  const items = app.db.all('SELECT ci.quantity, gi.* FROM character_inventory ci JOIN game_items gi ON gi.id = ci.game_item_id WHERE ci.character_id = ? AND ci.quantity > 0', c.id)
    .map((i) => ({ id: i.id, key: i.key, name: i.name, icon: i.icon, qty: i.quantity }));
  const appearance = parseJson(c.appearance, { useAvatar: true });
  const look = appearance.useAvatar === false ? { ...lookFromAvatar(avatarSpecs([c.account_id]).get(c.account_id)), ...appearance.look } : lookFromAvatar(avatarSpecs([c.account_id]).get(c.account_id));
  return {
    id: c.id,
    name: c.name,
    bio: c.bio,
    appearance,
    look,
    stats: { xp: stats.xp ?? 0, level: stats.level ?? 1, reputation: stats.reputation ?? 0, sessions: stats.sessions ?? 0, totalEarned: stats.totalEarned ?? 0 },
    cash: c.cash,
    favoriteRoleId: c.favorite_role_id,
    inventory: items,
    createdAt: c.created_at,
    lastPlayedAt: c.last_played_at,
  };
}

function requireSessionRow(id) {
  const s = app.db.get('SELECT * FROM larp_sessions WHERE id = ?', id);
  if (!s) throw E.notFound('Session not found');
  return s;
}

function gameCtx(ctx) {
  ctx.elevated = ctx.session?.elevatedUntil > now();
  return ctx;
}

function hostOrStaff(ctx, rt) {
  gameCtx(ctx);
  app.game.requireHost(rt, ctx);
}

export default function register(r) {
  r.get('/api/game/meta', () => ({
    roles: app.game.roleList(),
    gameItems: app.game.itemList(),
    scenarios: app.db.all('SELECT id, key, name, description, config FROM scenarios WHERE is_active = 1 ORDER BY id').map((s) => {
      const c = parseJson(s.config, {});
      return { id: s.id, key: s.key, name: s.name, description: s.description, lighting: c.lighting ?? 'day', roles: c.roles ?? 'all', objectives: c.objectives ?? [], startingCash: c.startingCash ?? 100, timeLimitMinutes: c.timeLimitMinutes ?? null };
    }),
    eventTypes: GAME_EVENT_TYPES,
    zones: WORLD.zones.map((z) => ({ key: z.key, name: z.name, kind: z.kind, icon: z.icon })),
  }));

  // ───── Characters ─────
  r.get('/api/game/characters', requireAuth, (ctx) => ({
    characters: app.db.all('SELECT * FROM characters WHERE account_id = ? ORDER BY COALESCE(last_played_at, created_at) DESC', ctx.account.id).map(characterView),
  }));

  r.post('/api/game/characters', requireActiveAccount, (ctx) => {
    const body = check(v.object({
      name: v.string({ min: 1, max: 30 }),
      bio: v.string({ max: 500, multiline: true }).default(''),
      useAvatar: v.bool().default(true),
      look: lookSchema.optional(),
      favoriteRoleId: v.int({ min: 1 }).nullable().optional(),
    }), ctx.body);
    const { db } = app;
    if (db.value('SELECT COUNT(*) FROM characters WHERE account_id = ?', ctx.account.id) >= 8) throw E.conflict('You can have up to 8 characters');
    if (body.favoriteRoleId && !db.get('SELECT 1 FROM game_roles WHERE id = ?', body.favoriteRoleId)) throw E.bad('Unknown role');
    const t = now();
    const id = db.run('INSERT INTO characters (account_id, name, bio, appearance, stats, favorite_role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ctx.account.id, body.name, body.bio, toJson({ useAvatar: body.useAvatar, look: body.look ?? {} }), toJson({ xp: 0, reputation: 0, sessions: 0 }), body.favoriteRoleId ?? null, t, t).id;
    ctx.status = 201;
    return characterView(db.get('SELECT * FROM characters WHERE id = ?', id));
  });

  r.patch('/api/game/characters/:id', requireActiveAccount, (ctx) => {
    const { db } = app;
    const c = db.get('SELECT * FROM characters WHERE id = ? AND account_id = ?', Number(ctx.params.id), ctx.account.id);
    if (!c) throw E.notFound('Character not found');
    const body = check(v.object({
      name: v.string({ min: 1, max: 30 }).optional(),
      bio: v.string({ max: 500, multiline: true }).optional(),
      useAvatar: v.bool().optional(),
      look: lookSchema.optional(),
      favoriteRoleId: v.int({ min: 1 }).nullable().optional(),
    }), ctx.body);
    const appearance = parseJson(c.appearance, { useAvatar: true });
    if (body.useAvatar !== undefined) appearance.useAvatar = body.useAvatar;
    if (body.look) appearance.look = { ...(appearance.look ?? {}), ...body.look };
    db.run('UPDATE characters SET name = ?, bio = ?, appearance = ?, favorite_role_id = ?, updated_at = ? WHERE id = ?',
      body.name ?? c.name, body.bio ?? c.bio, toJson(appearance), body.favoriteRoleId === undefined ? c.favorite_role_id : body.favoriteRoleId, now(), c.id);
    return characterView(db.get('SELECT * FROM characters WHERE id = ?', c.id));
  });

  r.delete('/api/game/characters/:id', requireAuth, (ctx) => {
    const { db } = app;
    const id = Number(ctx.params.id);
    if (db.get("SELECT 1 FROM session_participants p JOIN larp_sessions s ON s.id = p.session_id WHERE p.character_id = ? AND p.status = 'active' AND s.status != 'ended'", id)) {
      throw E.conflict('This character is in an active session');
    }
    const n = db.run('DELETE FROM characters WHERE id = ? AND account_id = ?', id, ctx.account.id).changes;
    if (!n) throw E.notFound('Character not found');
    return { ok: true };
  });

  // ───── Sessions ─────
  r.get('/api/game/sessions', (ctx) => ({
    sessions: app.game.listSessions({
      experienceId: ctx.query.experienceId ? Number(ctx.query.experienceId) : null,
      viewerId: ctx.account?.id ?? null,
      isStaff: Boolean(ctx.perms?.has('game.manage')),
      status: ctx.query.status ?? 'open',
      limit: 40,
    }),
  }));

  r.get('/api/game/history', requireAuth, (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 30 });
    const rows = app.db.all(
      `SELECT s.*, p.stats AS my_stats, p.role_id AS my_role, p.joined_at AS my_joined FROM session_participants p JOIN larp_sessions s ON s.id = p.session_id
        WHERE p.account_id = ? ORDER BY p.joined_at DESC LIMIT ? OFFSET ?`, ctx.account.id, limit + 1, offset);
    return page(rows.map((s) => ({
      ...app.game.sessionSummary(s, ctx.account.id),
      mine: { stats: parseJson(s.my_stats, {}), roleId: s.my_role, joinedAt: s.my_joined },
    })), limit, offset);
  });

  r.post('/api/game/sessions', requireActiveAccount, (ctx) => {
    const body = check(v.object({
      experienceId: v.int({ min: 1 }),
      scenarioId: v.int({ min: 1 }).optional(),
      name: v.string({ min: 1, max: 50 }).optional(),
      privacy: v.enum(['public', 'friends', 'private']).default('public'),
      maxPlayers: v.int({ min: 1, max: 50 }).optional(),
      settings: settingsSchema.default({}),
      characterId: v.int({ min: 1 }).optional(),
      roleId: v.int({ min: 1 }).optional(),
    }), ctx.body);
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`createsession:${ctx.account.id}`, 10, 600_000, 'You are creating sessions too quickly');
    ctx.status = 201;
    return app.game.createSession({ account: ctx.account, ...body });
  });

  r.post('/api/game/join-code', requireActiveAccount, (ctx) => {
    const { code, characterId, roleId } = check(v.object({ code: v.string({ min: 4, max: 10 }), characterId: v.int({ min: 1 }).optional(), roleId: v.int({ min: 1 }).optional() }), ctx.body);
    const s = app.db.get("SELECT * FROM larp_sessions WHERE access_code = ? AND status != 'ended'", code.toUpperCase());
    if (!s) throw E.notFound('No open session uses that code');
    return app.game.join(s.id, ctx.account, { characterId, roleId, accessCode: s.access_code });
  });

  r.get('/api/game/sessions/:id', (ctx) => {
    const s = requireSessionRow(Number(ctx.params.id));
    const viewerId = ctx.account?.id ?? null;
    const isStaff = Boolean(ctx.perms?.has('game.manage'));
    if (!app.game.canSee(s, viewerId, isStaff) && s.status !== 'ended') throw E.notFound('Session not found');
    const rt = s.status !== 'ended' ? app.game.runtime(s.id, { required: false }) : null;
    const participants = app.db.all('SELECT * FROM session_participants WHERE session_id = ? ORDER BY is_host DESC, joined_at', s.id);
    const roles = app.game.roles();
    const accounts = new Map(app.db.all(`SELECT id, username, display_name FROM accounts WHERE id IN (SELECT account_id FROM session_participants WHERE session_id = ?)`, s.id).map((a) => [a.id, a]));
    const log = app.db.all('SELECT * FROM session_log WHERE session_id = ? ORDER BY id DESC LIMIT 40', s.id).map((l) => ({ kind: l.kind, actorId: l.actor_account_id, payload: parseJson(l.payload, {}), at: l.created_at }));
    return {
      ...app.game.sessionSummary(s, viewerId, isStaff),
      scenarioDetail: rt ? app.game.scenarioView(rt) : null,
      participants: participants.map((p) => {
        const live = rt?.players.get(p.account_id);
        const acc = accounts.get(p.account_id);
        return {
          accountId: p.account_id,
          username: acc?.username,
          displayName: acc?.display_name,
          characterName: live?.name ?? parseJson(p.stats, {}).name ?? acc?.display_name,
          role: roles.get(p.role_id) ? { id: p.role_id, name: roles.get(p.role_id).name, color: roles.get(p.role_id).color, key: roles.get(p.role_id).key } : null,
          isHost: s.host_account_id === p.account_id,
          isBot: Boolean(p.is_bot),
          status: p.status,
          connected: live ? live.connected > 0 || live.isBot : false,
          look: live?.look ?? null,
          stats: live ? live.stats : parseJson(p.stats, {}).session ?? {},
        };
      }),
      log,
      isParticipant: Boolean(viewerId && participants.some((p) => p.account_id === viewerId && p.status === 'active')),
      isHost: viewerId === s.host_account_id,
    };
  });

  r.post('/api/game/sessions/:id/join', requireActiveAccount, (ctx) => {
    const body = check(v.object({ characterId: v.int({ min: 1 }).optional(), roleId: v.int({ min: 1 }).optional(), accessCode: v.string({ max: 10 }).optional() }), ctx.body);
    return app.game.join(Number(ctx.params.id), ctx.account, { ...body, accessCode: body.accessCode?.toUpperCase() });
  });

  r.post('/api/game/sessions/:id/leave', requireAuth, (ctx) => app.game.leave(Number(ctx.params.id), ctx.account.id));

  r.patch('/api/game/sessions/:id/settings', requireActiveAccount, (ctx) => {
    const rt = app.game.runtime(Number(ctx.params.id));
    hostOrStaff(ctx, rt);
    const body = check(v.object({
      name: v.string({ min: 1, max: 50 }).optional(),
      privacy: v.enum(['public', 'friends', 'private']).optional(),
      maxPlayers: v.int({ min: 1, max: 50 }).optional(),
      settings: settingsSchema.optional(),
      regenerateCode: v.bool().optional(),
    }), ctx.body);
    return app.game.updateSettings(rt.id, body, ctx.account.id);
  });

  r.post('/api/game/sessions/:id/role', requireActiveAccount, (ctx) => {
    const { roleId } = check(v.object({ roleId: v.int({ min: 1 }) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    return app.game.setRole(rt.id, ctx.account.id, roleId, { byHost: app.game.isHost(rt, ctx.account.id) });
  });

  r.post('/api/game/sessions/:id/assign-role', requireActiveAccount, (ctx) => {
    const { accountId, roleId } = check(v.object({ accountId: v.int({ min: 1 }), roleId: v.int({ min: 1 }) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    hostOrStaff(ctx, rt);
    return app.game.setRole(rt.id, accountId, roleId, { byHost: true });
  });

  r.post('/api/game/sessions/:id/kick', requireActiveAccount, (ctx) => {
    const { accountId } = check(v.object({ accountId: v.int({ min: 1 }) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    hostOrStaff(ctx, rt);
    if (accountId === ctx.account.id) throw E.bad('Use Leave to exit the session');
    return app.game.leave(rt.id, accountId, { kicked: true, reason: 'Removed by host' });
  });

  r.post('/api/game/sessions/:id/control', requireActiveAccount, (ctx) => {
    const { action } = check(v.object({ action: v.enum(['start', 'pause', 'resume', 'end', 'reset']) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    hostOrStaff(ctx, rt);
    return app.game.control(rt.id, action, ctx.account.id);
  });

  r.post('/api/game/sessions/:id/scenario', requireActiveAccount, (ctx) => {
    const { scenarioId } = check(v.object({ scenarioId: v.int({ min: 1 }) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    hostOrStaff(ctx, rt);
    return app.game.changeScenario(rt.id, scenarioId, ctx.account.id);
  });

  /** Hosts (when allowed) and players whose role has trigger_events can fire game events. */
  r.post('/api/game/sessions/:id/event', requireActiveAccount, (ctx) => {
    const body = check(v.object({ eventId: v.int({ min: 1 }).optional(), type: v.enum(GAME_EVENT_TYPES).optional(), params: v.json({ maxBytes: 4000 }).default({}) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    gameCtx(ctx);
    const p = rt.players.get(ctx.account.id);
    const allowed = (ctx.perms.has('game.manage') && ctx.elevated)
      || (app.game.isHost(rt, ctx.account.id) && rt.settings.hostEvents)
      || (p && app.game.hasPerm(p, 'trigger_events'));
    if (!allowed) throw E.forbidden('You cannot trigger events in this session');
    let type = body.type;
    let params = body.params;
    if (body.eventId) {
      const ev = app.db.get("SELECT * FROM scripted_events WHERE id = ? AND scope = 'game'", body.eventId);
      if (!ev) throw E.notFound('Event not found');
      type = ev.type;
      params = { ...parseJson(ev.params, {}), ...body.params };
      app.db.run('UPDATE scripted_events SET run_count = run_count + 1, last_run_at = ? WHERE id = ?', now(), ev.id);
      app.db.run('INSERT INTO event_runs (event_id, triggered_by_user_id, target, result, created_at) VALUES (?, ?, ?, ?, ?)', ev.id, ctx.user.id, toJson({ sessionId: rt.id }), '{}', now());
    }
    if (!type) throw E.bad('Choose an event');
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`gameevent:${rt.id}`, 30, 60_000, 'Too many events, slow down');
    return app.game.triggerEvent(rt.id, type, params, { accountId: ctx.account.id, userId: ctx.user.id });
  });

  r.post('/api/game/sessions/:id/invite', requireActiveAccount, (ctx) => {
    const { accountId } = check(v.object({ accountId: v.int({ min: 1 }) }), ctx.body);
    const rt = app.game.runtime(Number(ctx.params.id));
    if (!rt.players.has(ctx.account.id)) throw E.forbidden('Join the session first');
    const setting = settingsOf(accountId).privacy.gameInvites;
    if (setting === 'nobody' || (setting === 'friends' && !areFriends(accountId, ctx.account.id))) throw E.forbidden('That person is not accepting invites', 'invites_closed');
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`invite:${ctx.account.id}`, 30, 600_000, 'Too many invites');
    notify(accountId, {
      type: 'game_invite', title: `${ctx.account.display_name} invited you to ${rt.name}`, body: `${rt.experienceName} · ${rt.scenario.name}`,
      actorId: ctx.account.id, data: { sessionId: rt.id, experienceId: rt.experienceId, accessCode: rt.accessCode },
    });
    return { ok: true };
  });

  r.get('/api/game/sessions/:id/stream', requireAuth, (ctx) => {
    app.game.attachStream(Number(ctx.params.id), ctx.account.id, ctx.res);
    return HANDLED;
  });

  r.post('/api/game/sessions/:id/input', requireAuth, (ctx) => {
    const { x, y } = check(v.object({ x: v.number({ min: -1, max: 1 }), y: v.number({ min: -1, max: 1 }) }), ctx.body);
    return app.game.input(Number(ctx.params.id), ctx.account.id, x, y);
  });

  r.post('/api/game/sessions/:id/action', requireActiveAccount, (ctx) => {
    const body = check(v.object({
      type: v.string({ min: 1, max: 30 }),
      targetId: v.int({ min: 1 }).optional(),
      itemId: v.int({ min: 1 }).optional(),
      amount: v.int({ min: 1, max: 1_000_000 }).optional(),
      text: v.string({ max: 120 }).optional(),
      reason: v.string({ max: 60 }).optional(),
      emote: v.string({ max: 30 }).optional(),
    }), ctx.body);
    return app.game.action(Number(ctx.params.id), ctx.account.id, body);
  });

  r.post('/api/game/sessions/:id/chat', requireActiveAccount, (ctx) => {
    const { text } = check(v.object({ text: v.string({ min: 1, max: 200 }) }), ctx.body);
    return app.game.chat(Number(ctx.params.id), ctx.account.id, text);
  });
}
