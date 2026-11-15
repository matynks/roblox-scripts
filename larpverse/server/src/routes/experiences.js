import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { accountCards } from '../services/accounts.js';
import { badgesFor, perksOf } from '../services/badges.js';
import { fileUrl } from '../services/files.js';
import { now, page, paginate, parseJson } from '../util.js';
import { v, check } from '../validate.js';

export const GENRES = ['roleplay', 'adventure', 'simulator', 'tycoon', 'obby', 'horror', 'social', 'racing', 'sports', 'puzzle', 'showcase'];

/** Shapes many experiences, adding live player counts and the viewer's favorite/vote state. */
export function experienceViews(rows, viewerId) {
  const { db } = app;
  if (rows.length === 0) return [];
  const creators = accountCards(rows.map((r) => r.creator_account_id).filter(Boolean), { viewerId });
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');
  const favCounts = new Map(db.all(`SELECT experience_id, COUNT(*) AS n FROM experience_favorites WHERE experience_id IN (${ph}) GROUP BY experience_id`, ...ids).map((r) => [r.experience_id, r.n]));
  const myFavs = viewerId ? new Set(db.all(`SELECT experience_id FROM experience_favorites WHERE account_id = ? AND experience_id IN (${ph})`, viewerId, ...ids).map((r) => r.experience_id)) : new Set();
  const myVotes = viewerId ? new Map(db.all(`SELECT experience_id, vote FROM experience_votes WHERE account_id = ? AND experience_id IN (${ph})`, viewerId, ...ids).map((r) => [r.experience_id, r.vote])) : new Map();
  const groupNames = new Map(db.all(`SELECT id, name FROM user_groups WHERE id IN (SELECT creator_group_id FROM experiences WHERE id IN (${ph}))`, ...ids).map((g) => [g.id, g.name]));
  return rows.map((e) => {
    const live = app.game?.activePlayers(e.id) ?? 0;
    const votes = e.likes + e.dislikes;
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      genre: e.genre,
      art: parseJson(e.art, {}),
      thumbnail: fileUrl(e.thumbnail_file_id),
      engine: e.engine,
      defaultScenarioId: e.default_scenario_id,
      maxPlayers: e.max_players,
      isFeatured: Boolean(e.is_featured),
      status: e.status,
      creator: creators.get(e.creator_account_id) ?? null,
      group: e.creator_group_id ? { id: e.creator_group_id, name: groupNames.get(e.creator_group_id) } : null,
      visits: e.visits,
      likes: e.likes,
      dislikes: e.dislikes,
      rating: votes ? Math.round((e.likes / votes) * 100) : null,
      favorites: e.favorites_override ?? (favCounts.get(e.id) ?? 0),
      playing: live + (e.active_override ?? 0),
      livePlaying: live,
      isFavorite: myFavs.has(e.id),
      myVote: myVotes.get(e.id) ?? 0,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    };
  });
}

function featuredCreatorIds() {
  const ids = app.db.all("SELECT DISTINCT ab.account_id FROM account_badges ab JOIN badges b ON b.id = ab.badge_id WHERE json_extract(b.perks, '$.featuredCreator') = 1").map((r) => r.account_id);
  return new Set(ids);
}

/** Discovery lists. The catalog of experiences is small, so sorting happens on shaped rows. */
export function discover(sort, { viewerId, genre, q, limit = 30, offset = 0 } = {}) {
  const { db } = app;
  let rows;
  if (sort === 'favorites') {
    if (!viewerId) return { items: [], nextOffset: null };
    rows = db.all("SELECT e.* FROM experience_favorites f JOIN experiences e ON e.id = f.experience_id WHERE f.account_id = ? AND e.status = 'public' ORDER BY f.created_at DESC", viewerId);
  } else if (sort === 'history') {
    if (!viewerId) return { items: [], nextOffset: null };
    rows = db.all(
      `SELECT e.*, MAX(ph.started_at) AS last_played FROM play_history ph JOIN experiences e ON e.id = ph.experience_id
        WHERE ph.account_id = ? GROUP BY e.id ORDER BY last_played DESC`, viewerId);
  } else {
    rows = db.all("SELECT * FROM experiences WHERE status = 'public'");
  }
  if (genre) rows = rows.filter((r) => r.genre === genre);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle));
  }
  let views = experienceViews(rows, viewerId);
  const byPopular = (a, b) => b.playing - a.playing || b.visits - a.visits;
  switch (sort) {
    case 'featured': {
      const fc = featuredCreatorIds();
      views = views.filter((x) => x.isFeatured || (x.creator && fc.has(x.creator.id))).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || byPopular(a, b));
      break;
    }
    case 'popular': views.sort(byPopular); break;
    case 'top_rated': views.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.likes - a.likes); break;
    case 'recent': views.sort((a, b) => b.updatedAt - a.updatedAt); break;
    case 'newest': views.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'most_visited': views.sort((a, b) => b.visits - a.visits); break;
    case 'recommended': {
      const genres = viewerId ? db.all(
        `SELECT e.genre, COUNT(*) AS n FROM play_history ph JOIN experiences e ON e.id = ph.experience_id WHERE ph.account_id = ? GROUP BY e.genre`, viewerId) : [];
      const friendPlays = viewerId ? new Map(db.all(
        `SELECT ph.experience_id, COUNT(*) AS n FROM play_history ph WHERE ph.account_id IN (
           SELECT CASE WHEN account_a = ? THEN account_b ELSE account_a END FROM friendships WHERE status = 'accepted' AND (account_a = ? OR account_b = ?))
         GROUP BY ph.experience_id`, viewerId, viewerId, viewerId).map((r) => [r.experience_id, r.n])) : new Map();
      const gw = new Map(genres.map((g) => [g.genre, g.n]));
      const score = (x) => (gw.get(x.genre) ?? 0) * 5 + (friendPlays.get(x.id) ?? 0) * 8 + Math.log10(1 + x.visits) + x.playing / 50 + (x.rating ?? 50) / 25;
      views.sort((a, b) => score(b) - score(a));
      break;
    }
    case 'favorites':
    case 'history':
      break;
    default:
      throw E.bad('Unknown sort');
  }
  return page(views.slice(offset, offset + limit + 1), limit, offset);
}

export function recordPlay(accountId, experienceId, sessionId = null) {
  const { db } = app;
  db.run('UPDATE experiences SET visits = visits + 1 WHERE id = ?', experienceId);
  return db.run('INSERT INTO play_history (account_id, experience_id, session_id, started_at) VALUES (?, ?, ?, ?)', accountId, experienceId, sessionId, now()).id;
}

export default function register(r) {
  r.get('/api/experiences/genres', () => ({ genres: GENRES }));

  r.get('/api/experiences', (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 30 });
    const genre = ctx.query.genre && GENRES.includes(ctx.query.genre) ? ctx.query.genre : null;
    return discover(ctx.query.sort ?? 'popular', { viewerId: ctx.account?.id ?? null, genre, q: String(ctx.query.q ?? '').slice(0, 60), limit, offset });
  });

  r.get('/api/experiences/:id', (ctx) => {
    const { db } = app;
    const e = db.get('SELECT * FROM experiences WHERE id = ?', Number(ctx.params.id));
    if (!e || (e.status !== 'public' && !ctx.perms?.has('experiences.manage') && e.creator_account_id !== ctx.account?.id)) throw E.notFound('Experience not found');
    const [view] = experienceViews([e], ctx.account?.id ?? null);
    const scenario = e.default_scenario_id ? db.get('SELECT id, key, name, description FROM scenarios WHERE id = ?', e.default_scenario_id) : null;
    const servers = app.game ? app.game.listSessions({ experienceId: e.id, viewerId: ctx.account?.id ?? null, limit: 20 }) : [];
    const similar = experienceViews(db.all("SELECT * FROM experiences WHERE status = 'public' AND genre = ? AND id != ? ORDER BY visits DESC LIMIT 8", e.genre, e.id), ctx.account?.id ?? null);
    const creatorPerks = e.creator_account_id ? perksOf(badgesFor([e.creator_account_id]).get(e.creator_account_id)) : null;
    return { ...view, scenario, servers, similar, creatorPerks };
  });

  r.post('/api/experiences/:id/favorite', requireAuth, (ctx) => {
    const id = Number(ctx.params.id);
    if (!app.db.get('SELECT 1 FROM experiences WHERE id = ?', id)) throw E.notFound('Experience not found');
    app.db.run('INSERT OR IGNORE INTO experience_favorites (account_id, experience_id, created_at) VALUES (?, ?, ?)', ctx.account.id, id, now());
    return { isFavorite: true };
  });

  r.delete('/api/experiences/:id/favorite', requireAuth, (ctx) => {
    app.db.run('DELETE FROM experience_favorites WHERE account_id = ? AND experience_id = ?', ctx.account.id, Number(ctx.params.id));
    return { isFavorite: false };
  });

  /** Like (1), dislike (-1) or clear (0). Aggregates stay consistent with the votes table. */
  r.post('/api/experiences/:id/vote', requireActiveAccount, (ctx) => {
    const { vote } = check(v.object({ vote: v.enum([1, -1, 0]) }), ctx.body);
    const id = Number(ctx.params.id);
    const { db } = app;
    return db.tx(() => {
      if (!db.get('SELECT 1 FROM experiences WHERE id = ?', id)) throw E.notFound('Experience not found');
      const prev = db.value('SELECT vote FROM experience_votes WHERE account_id = ? AND experience_id = ?', ctx.account.id, id) ?? 0;
      if (prev === 1) db.run('UPDATE experiences SET likes = MAX(0, likes - 1) WHERE id = ?', id);
      if (prev === -1) db.run('UPDATE experiences SET dislikes = MAX(0, dislikes - 1) WHERE id = ?', id);
      if (vote === 0) db.run('DELETE FROM experience_votes WHERE account_id = ? AND experience_id = ?', ctx.account.id, id);
      else {
        db.run(`INSERT INTO experience_votes (account_id, experience_id, vote, created_at) VALUES (?, ?, ?, ?)
                ON CONFLICT(account_id, experience_id) DO UPDATE SET vote = excluded.vote`, ctx.account.id, id, vote, now());
        db.run(`UPDATE experiences SET ${vote === 1 ? 'likes = likes + 1' : 'dislikes = dislikes + 1'} WHERE id = ?`, id);
      }
      const e = db.get('SELECT likes, dislikes FROM experiences WHERE id = ?', id);
      return { myVote: vote, likes: e.likes, dislikes: e.dislikes };
    });
  });

  /** Showcase experiences are "played" directly; LARP experiences go through game sessions. */
  r.post('/api/experiences/:id/play', requireActiveAccount, (ctx) => {
    const e = app.db.get("SELECT * FROM experiences WHERE id = ? AND status != 'archived'", Number(ctx.params.id));
    if (!e) throw E.notFound('Experience not found');
    if (e.engine === 'larp') return { engine: 'larp', experienceId: e.id };
    const historyId = recordPlay(ctx.account.id, e.id);
    return { engine: 'showcase', historyId };
  });

  r.get('/api/me/history', requireAuth, (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 40 });
    const rows = app.db.all(
      `SELECT ph.*, e.name, e.art, e.genre FROM play_history ph JOIN experiences e ON e.id = ph.experience_id
        WHERE ph.account_id = ? ORDER BY ph.started_at DESC LIMIT ? OFFSET ?`, ctx.account.id, limit + 1, offset);
    return page(rows.map((h) => ({
      id: h.id, experience: { id: h.experience_id, name: h.name, art: parseJson(h.art, {}), genre: h.genre }, sessionId: h.session_id, startedAt: h.started_at, endedAt: h.ended_at,
    })), limit, offset);
  });
}
