# Architecture

## 1. Overview

```
┌──────────────────────────── Android app (Expo SDK 58, React Native 0.88, TypeScript) ───────────────────────────┐
│ expo-router screens (src/app)                                                                                   │
│   └─ feature hooks (TanStack Query: caching, retries, pagination, invalidation)                                │
│        └─ Backend interface (src/api/backend.ts) ── chosen once at startup ──┐                                  │
│             ├─ SupabaseBackend  (online: supabase-js → PostgREST RPCs, RLS-guarded selects, GoTrue auth)        │
│             └─ LocalBackend     (offline demo: same contract, on-device store, same rule tables)                │
│ Zustand: device prefs (theme, haptics, sound)   SecureStore: auth session (chunked)   NetInfo: online banner    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                │ HTTPS (anon key + user JWT only)
┌───────────────────────────────▼──────────────────── Supabase ──────────────────────────────────────────────────┐
│ GoTrue (email+password, recovery OTP/link)                                                                     │
│ PostgREST → public schema: tables with RLS (read paths) + SECURITY DEFINER RPCs (every write that matters)     │
│ private schema (not exposed): ledger engine, XP, quests, achievements, notifications, audit, rate limits        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Backend selection.** If the build was made with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, the app uses Supabase. Otherwise it runs the offline backend so the APK is fully playable with no setup. Players never see configuration; Settings only shows "Online" or "Offline (saved on this device)".

## 2. Security model

| Rule | Mechanism |
|---|---|
| Client never writes balances, ledger, inventory, ownership, stats, roles | `revoke all` on every table from `anon`/`authenticated`; only `SELECT` (plus narrow column `UPDATE` on settings and notifications) is granted back; RLS on every table |
| Every privileged action is server-side | `SECURITY DEFINER` functions with `search_path = ''`, fully-qualified names; `EXECUTE` revoked from `public`/`anon`, granted to `authenticated` |
| Internals unreachable | Helpers live in schema `private`, which PostgREST does not expose and on which `USAGE` is revoked |
| Atomic currency | One function (`private.apply_currency`) locks the wallet row (`FOR UPDATE`), checks the result is ≥ 0, writes the wallet and a ledger row with `balance_after` in the same transaction |
| No double-spend / duplicate purchase | Client sends an idempotency key per purchase intent; `unique (user_id, idempotency_key)`; the key is checked *after* the wallet lock, so concurrent retries serialize and the retry returns the original result |
| Game rewards can't be forged | Server-issued sessions; score plausibility bound (`max_score_per_second × elapsed`), per-session and per-day caps, minimum session length; pass perks are snapshotted at session start |
| Developer access | `developer_roles` table (no RLS policies → invisible via API); `private.require_developer()` at the top of every `admin_*` RPC; owner-only role management; non-owners cannot edit owners |
| Auditability | Every admin action writes `audit_logs` (actor, action, target, reason, before/after JSON); admin currency changes are also ledger rows with `actor_id` |
| Privacy | `private.can_view(owner, scope)` combines block state with per-scope visibility (`everyone` / `friends` / `nobody`) for inventory, friends and activity; list rows are visible only if *both* parties allow it |
| Abuse limits | `private.rate_limit(action, max, window)` buckets for friend requests, follows, reports, game sessions, username checks |
| Secrets | Only the public anon key ships in the app. The service-role key is never referenced in the client code |

## 3. Data model (public schema)

Identity: `profiles`, `user_settings`, `avatars`, `outfits`, `developer_roles`
Economy: `wallets`, `currency_transactions`, `catalog_items`, `item_sets`, `item_price_points`, `inventory_items`, `item_favorites`, `collection_claims`
Games: `games`, `game_passes`, `game_pass_ownership`, `game_sessions`, `player_game_stats`, `game_votes`, `game_favorites`
Social: `friend_requests`, `friendships` (two rows per pair), `follows`, `blocks`, `reports`, `notifications`, `activity_events`
Progression: `achievements`, `user_achievements`, `daily_streaks`, `quests`, `quest_progress`
Operations: `audit_logs`, `rate_limit_buckets`, `app_meta`

Content (catalog, games, passes, achievements, quests, sets) and the simulated NPC community are defined **once** in TypeScript (`src/content`) and generated into a migration (`npm run gen:content`) and into the offline backend, so both backends serve identical worlds.

NPC players are rows in `profiles` with `is_npc = true` and no `auth.users` row (profiles are linked to `auth.users` by a trigger, not a foreign key, so the world can be seeded without touching Supabase's auth internals).

## 4. App structure

```
src/app/                      expo-router routes
  (auth)/                     welcome, login, register, forgot-password, reset-password, confirm-email
  (app)/(tabs)/               home, discover, avatar, marketplace, profile
  (app)/…                     inventory, friends, notifications, settings, edit-profile, transactions,
                              achievements, activity, outfits, rewards, search, user/[username],
                              item/[id], game/[id], play/[id], modify/* (developer)
src/api/                      Backend contract, Supabase + Local implementations, error mapping
src/content/                  catalog, games, achievements, quests, NPC world generator
src/domain/                   pure rules shared by the offline backend and tests (levels, rewards, validation)
src/games/                    4 engines (pure step functions) + renderers
src/avatar/                   SVG avatar + item renderer
src/ui/                       design system (theme tokens, Text, Button, Card, Sheet, Toast, Empty/Error states)
supabase/migrations/          schema, RLS, functions, content
tests/                        integration tests against a live Supabase stack
```

## 5. Reliability

* TanStack Query: retries with exponential backoff for reads; mutations are not auto-retried except purchases, which are safe to retry because of idempotency keys.
* NetInfo drives an offline banner and pauses queries.
* Lists that grow (transactions, notifications, catalog, inventory, accounts in the Modify Menu) are paginated.
* Session: supabase-js auto-refresh tied to AppState; token stored in SecureStore in chunks (values > 2 KB are split). A refresh failure signs the player out with a "session expired" message.
