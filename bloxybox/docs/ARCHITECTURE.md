# BloxyBox — Architecture & Plan

This is the Phase 1 output. It covers the assessment of the existing repository,
the Android architecture, the database schema, the navigation map, the roadmap,
the dependency list and the risk assessment for the Samsung Galaxy A15.

---

## 1. Technical assessment of the existing repository

The repository `matynks/roblox-scripts` contained three unrelated things before
BloxyBox work started:

| Path | What it is | Reusable for BloxyBox? |
| --- | --- | --- |
| `index.html` | A single static web page ("script hub") that copies a Roblox exploit loadstring to the clipboard. | **No.** It is a browser page for a different purpose. Nothing in it fits a native Android app. |
| `rivals.lua` | A one-line Lua `loadstring` that downloads a third-party script from another GitHub account. | **No.** It targets real Roblox game servers, which BloxyBox must never touch. |
| `exit-code-360/` | A Remotion (React + TypeScript) video-rendering project for an animated explainer. | **No.** It renders video frames on a desktop and has no app, navigation, auth or data layer. Its rigging ideas are not needed for a 2D mobile UI. |

Findings:

* **No BloxyBox code existed.** BloxyBox is a new project in `bloxybox/`.
* **No Electron, Windows or other desktop-only configuration existed**, so there was nothing to remove.
* The three existing items are left **untouched**: removing them was not requested and
  they don't affect the app. BloxyBox doesn't import, bundle or link to any of them.
* Tooling available in the build container: Node 22, JDK 21, Gradle, PostgreSQL 16,
  and the Android SDK (installed for this project). There is no `/dev/kvm`, so an
  Android emulator **cannot** run in the build container. On-device testing must be
  done on a real phone.

---

## 2. Android architecture

### 2.1 Stack (as installed)

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Expo SDK (managed workflow, Continuous Native Generation) | 57 (`expo ~57.0.33`) |
| Runtime | React Native, New Architecture (Fabric/TurboModules), Hermes | 0.86.3 |
| Language | TypeScript (strict) | 6.0 |
| Navigation | Expo Router (file-based, `src/app/`) | 57 |
| Server data | TanStack Query, persisted to SQLite for offline reads | 5 |
| Local state | Zustand | 5 |
| Backend | Supabase (Postgres + Auth + PostgREST RPC) via `@supabase/supabase-js` | 2 |
| Local persistence | `expo-sqlite` (key-value store for the query cache, plus a games table) | 57 |
| Secrets on device | `expo-secure-store` (Android Keystore-backed) for the auth session | 57 |
| Animation & gestures | Reanimated 4 + react-native-worklets, Gesture Handler | 4.5 / 2.32 |
| Vector graphics | react-native-svg (avatar, coin, logo, illustrations) | 15 |
| Build | EAS Build (cloud) **or** local Gradle (`expo prebuild` + `assembleRelease`) | — |

**Why SDK 57 and not 58:** SDK 58 shipped on 2026-09-29 and is still on early
patch releases. SDK 57 (released 2026-06-30) has had 33 patch releases, and
every library here supports it. Upgrading later is a routine `npx expo install expo@^58 --fix`.

**Why no React Native Skia:** both mini-games render with plain `View`s driven
by Reanimated on the UI thread (see 2.5). Skia would add roughly 5 MB per ABI
and a heavier native build without any visible benefit for these games. It
stays an option for future experiences that need custom drawing.

### 2.2 Layering

```
src/app/            Routes only (Expo Router). Thin screens: compose features and components.
src/features/<x>/   Feature modules: hooks, components and pure logic per domain
                    (auth, wallet, market, inventory, avatar, passes, discover, social, games, dev)
src/api/            Supabase access: typed RPC wrappers, query keys, row types, error mapping
src/components/ui/  Design-system primitives (Text, Button, Card, Badge, Input, Screen, states…)
src/theme/          Design tokens: colour, spacing, radii, typography, elevation
src/lib/            Infrastructure: config, supabase client, secure/kv storage, query client,
                    network status, formatting
src/stores/         Zustand stores: session, preferences, developer-sequence
src/games/          Mini-game engine helpers + one folder per game (pure logic + renderer)
supabase/           SQL migrations, seed data, SQL test suite
scripts/            Local tooling (database test runner)
```

Rules:

* Screens never call `supabase` directly. They use hooks from `src/features/*`,
  which use `src/api/*`.
* Any value that matters to the economy or to permissions (balance, ownership,
  roles, rewards) is **read** from the server and **changed only by RPC**. The
  client never computes a new balance. After a mutation it shows the value the
  server returned and invalidates related queries.
* Game logic lives in **pure TypeScript modules**, so Jest can test it without
  rendering.

### 2.3 Authentication & session

* Email + password through Supabase Auth (passwords are hashed by Supabase Auth with bcrypt; the app never stores them).
* The session (access token + refresh token) is persisted by a custom storage
  adapter backed by **expo-secure-store** (Android Keystore encryption). Values are
  split into chunks because SecureStore discourages values over 2 KB.
* `supabase.auth.startAutoRefresh()` runs only while the app is in the foreground (`AppState` listener).
* A Zustand session store mirrors `onAuthStateChange`. The root layout uses
  Expo Router's `Stack.Protected` guards to switch between the auth stack and the app stack.
* Sign-up passes the chosen username in user metadata. A Postgres trigger on
  `auth.users` creates the profile, wallet (with the welcome bonus), avatar, stats and starter items atomically.
* If the Supabase project requires email confirmation, sign-up shows a
  "confirm your email, then sign in" state. No deep-link handling is required.

### 2.4 Configuration

* Build-time: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
  `.env` (template: `.env.example`). The anon key is a *public* key by design: all
  protection comes from Row Level Security and SECURITY DEFINER RPCs. No
  service-role key or other secret ever ships in the app.
* Runtime fallback: if an APK was built without those variables, a **Server
  setup** screen lets the user enter the URL and anon key. They are stored in
  SecureStore. This lets one prebuilt APK connect to any BloxyBox Supabase project.

### 2.5 Mini-game runtime

* Each game is a module: `logic.ts` (pure, deterministic, seeded RNG),
  `<Game>.tsx` (renderer + input) and a registry entry `{ slug, component, meta }`.
  New experiences plug into the registry without touching other screens.
* **Box Stack** (timing game): the moving block is animated on the UI thread by
  Reanimated. The tap gesture's worklet reads the block's *exact* on-screen
  position, so what the player sees is what gets placed. React re-renders only once per placement.
* **Lane Dash** (runner): all obstacles and coins sit inside one "world"
  container whose `translateY` is driven by a `useFrameCallback` worklet. Per
  frame, the UI thread advances one number and runs a small collision check. React
  re-renders only when chunks of track are spawned or despawned, a few times per second.
* A shared `GameShell` owns the session lifecycle: ready → playing → paused → result.
  Pausing happens automatically when the app goes to the background.
* **Rewards are server-authoritative:** `start_game_session` returns a session id
  and the player's enabled pass perks. `submit_game_result` re-checks the score
  against the server clock and the experience's limits, computes the reward and
  credits the wallet. Without a network connection the game runs in clearly
  labelled **practice mode** (no session, no reward).

### 2.6 Offline behaviour

* NetInfo feeds TanStack Query's `onlineManager`, and an offline banner is shown app-wide.
* Query results are persisted to SQLite (`expo-sqlite/kv-store`), so profile,
  wallet, inventory, catalog and experience lists can still be viewed offline
  (marked "last synced …").
* Mutations (purchases, equip, follow, daily reward, dev tools) are **not**
  queued. They are blocked while offline, with a clear message, because economy
  operations must be confirmed by the server.
* Local SQLite also keeps practice-mode personal bests per game.

### 2.7 Developer Modify Menu

* It is not in navigation or settings. **Access sequence:** Settings → About → tap
  the build number 7 times within 4 s, then long-press the BloxyBox logo within 6 s.
* The sequence only *asks*. The client then calls `dev_whoami()`. The server
  checks `user_roles` for a `developer` row and logs denied attempts. Non-developers see nothing.
* Every `dev_*` RPC re-checks the role server-side (SECURITY DEFINER +
  `is_developer()`) and writes `dev_audit_log` in the same transaction.
  The `/dev` route renders nothing useful without the role, because every call would be rejected anyway.
* The developer role can only be granted with SQL by the project owner (service
  role or the SQL editor). No RPC can grant it.

---

## 3. Database schema (Supabase / Postgres 15+)

All tables live in `public` with RLS **enabled**. Default table privileges for
`anon`/`authenticated` are revoked and then granted narrowly. All writes to
economy tables go through `SECURITY DEFINER` functions with `search_path` pinned.

### 3.1 Entities

| Table | Purpose | Key columns / constraints | Client access |
| --- | --- | --- | --- |
| `profiles` | Public identity | `id` (= `auth.users.id`), `username` unique `^[a-z0-9_]{3,20}$`, `display_name` 1–30, `bio` ≤ 200, `accent` enum-check | select: authenticated. Write: RPC only |
| `user_roles` | Trusted role system | PK (`user_id`,`role`), `role in ('developer')` | none (RPC `dev_whoami`) |
| `wallets` | Authoritative BoxCoins balance | `balance bigint check >= 0`, lifetime earned/spent | select own |
| `transactions` | Append-only ledger | `amount <> 0`, `balance_after >= 0`, `kind` check, reference type/id, metadata | select own |
| `items` | Catalog of avatar items | `slug` unique, `slot` check, `rarity` check, `asset_key`, colours | select all |
| `marketplace_listings` | What is for sale and for how much | `item_id` unique, `price > 0`, `is_active`, `is_featured` | select all |
| `inventory` | Ownership records | unique (`user_id`,`item_id`), denormalised `slot`, partial unique (`user_id`,`slot`) where equipped, `acquired_via`, `price_paid` | select own + others' equipped |
| `avatars` | Base appearance | `skin_color`, `head_shape` checks | select all |
| `experiences` | Discover catalog + reward rules | `slug`, `status in ('playable','in_development')`, category, featured, reward/limit parameters, `play_count` | select all |
| `game_passes` | Simulated passes per experience | `experience_id`, `price > 0`, `perk` check | select all |
| `game_pass_ownership` | Pass ownership | PK (`user_id`,`pass_id`), `enabled` (pass management), `acquired_via` | select own |
| `game_sessions` | One play-through | `status`, `score`, `outcome`, `reward`, `rejection_reason` | select own |
| `game_progress` | Per-user per-experience progress | best score, plays, wins, coins earned | select all (leaderboards) |
| `follows` | Social graph | PK (`follower_id`,`followee_id`), no self-follow | select all |
| `profile_stats` | Level, XP, **simulated** followers, profile visits, streaks | non-negative checks | select all |
| `profile_visits` | De-duplicates visit counting | unique (visitor, visited, day) | none |
| `dev_audit_log` | Every developer action and denied access | actor, action, target, details jsonb | none (RPC for developers) |

Friends = mutual follows (derived, no table). Displayed follower counts are
`real followers + simulated followers`, always shown with a breakdown and a
**SIM** marker so simulated numbers are never mistaken for real people.

### 3.2 RPC surface

User RPCs (`authenticated` only):

| Function | Validates |
| --- | --- |
| `is_username_available(text)` (also `anon`) | format + uniqueness |
| `update_profile(display_name, bio, accent)` / `set_username(text)` | lengths, enum, uniqueness |
| `update_avatar(skin_color, head_shape)` | allowed palette |
| `claim_daily_reward()` | once per UTC day, streak logic |
| `purchase_item(listing_id)` | active listing, not owned, sufficient balance (row-locked) |
| `equip_item(item_id)` / `unequip_slot(slot)` | ownership |
| `purchase_game_pass(pass_id)` / `set_game_pass_enabled(pass_id, bool)` | active pass, not owned, balance / ownership |
| `start_game_session(slug)` | playable experience; expires stale sessions; returns enabled perks |
| `submit_game_result(session_id, score, outcome, duration_ms)` | ownership, single submit, max age, score ≤ rate × server-elapsed, win plausibility, per-run and daily caps; computes reward/XP/level server-side |
| `follow_user(uuid)` / `unfollow_user(uuid)` | no self-follow |
| `get_profile_summary(uuid)` / `list_connections(uuid, kind)` / `get_leaderboard(slug)` | read helpers |
| `record_profile_visit(uuid)` | once per visitor per day |

Developer RPCs (role-checked on every call, audited):
`dev_whoami`, `dev_find_users`, `dev_set_balance`, `dev_adjust_balance`,
`dev_set_stats`, `dev_grant_item`, `dev_revoke_item`, `dev_grant_pass`,
`dev_revoke_pass`, `dev_reset_user`, `dev_diagnostics`, `dev_list_transactions`,
`dev_list_audit_log`.

All balance changes go through one internal function, `_apply_wallet_change`.
It locks the wallet row, applies the delta, rejects a negative result and writes
the ledger row, so `balance = Σ transactions.amount` holds as an invariant (and is tested).

---

## 4. Navigation structure

```
src/app/
├── _layout.tsx                  Providers + Stack with Protected guards
├── setup.tsx                    Server setup (only when no backend config exists)
├── (auth)/
│   ├── welcome.tsx              Brand intro → sign in / create account
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── (app)/
    ├── (tabs)/
    │   ├── _layout.tsx          Bottom tabs
    │   ├── index.tsx            Home: wallet, daily reward, continue playing, featured
    │   ├── discover.tsx         Featured / Popular / New, search, categories
    │   ├── avatar.tsx           Avatar editor + inventory
    │   ├── shop.tsx             Marketplace (filter, sort)
    │   └── profile.tsx          Own profile + stats
    ├── experience/[slug].tsx    Experience detail, passes, leaderboard, Play
    ├── play/[slug].tsx          Full-screen game (GameShell)
    ├── item/[id].tsx            Item detail: buy / equip
    ├── pass/[id].tsx            Game Pass detail: buy / enable
    ├── passes.tsx               My Game Passes (management)
    ├── wallet/index.tsx         Balance + transaction history
    ├── wallet/[id].tsx          Transaction detail
    ├── user/[id].tsx            Another player's profile
    ├── connections/[id].tsx     Followers / Following / Friends
    ├── players.tsx              Find players
    ├── settings/index.tsx       Account, preferences, About (hidden sequence)
    ├── settings/edit-profile.tsx
    └── dev/index.tsx            Modify Menu (server role required)
```

---

## 5. Implementation roadmap

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 1 | Assessment, architecture, schema, navigation, risks (this document) | Document committed |
| 2 | Expo project, design tokens, UI primitives, providers, storage, query client, Jest, lint | Typecheck + lint + unit tests pass; app bundles for Android |
| 3 | Auth (sign-up/in/out), session storage, profile, edit profile, settings, server setup | Auth flows wired; SQL tests for profile RPCs pass |
| 4 | Wallet, ledger, daily reward, transaction history/detail, inventory, avatar editor | Ledger invariant tests pass |
| 5 | Marketplace (filter/sort, detail, purchase), Game Passes (list, buy, manage) | Purchase/ownership SQL tests pass |
| 6 | Discover (sections, search, categories, detail), follows, friends, player search, stats, leaderboards | Social SQL tests pass |
| 7 | Box Stack + Lane Dash, GameShell, sessions, rewards, practice mode, perks | Logic unit tests pass; reward validation SQL tests pass |
| 8 | Modify Menu, hidden sequence, dev RPCs, audit log, diagnostics | Authorization SQL tests pass (non-developer is denied for every RPC) |
| 9 | QA: full test suite, performance review, offline behaviour | All suites green; known issues documented |
| 10 | Release APK build, install guide, release checklist | APK built and verified with `aapt`/`apksigner` |

---

## 6. Dependencies

Runtime: `expo`, `react`, `react-native`, `expo-router`, `react-native-screens`,
`react-native-safe-area-context`, `expo-linking`, `expo-constants`,
`expo-status-bar`, `expo-splash-screen`, `expo-system-ui`, `expo-font`,
`@expo-google-fonts/outfit` (SIL OFL), `react-native-reanimated`,
`react-native-worklets`, `react-native-gesture-handler`, `react-native-svg`,
`expo-secure-store`, `expo-sqlite`, `@react-native-community/netinfo`,
`expo-haptics`, `@supabase/supabase-js`, `react-native-url-polyfill`,
`@tanstack/react-query`, `@tanstack/react-query-persist-client`,
`@tanstack/query-async-storage-persister`, `zustand`, `@expo/vector-icons` (bundled with Expo; MIT).

Development: `typescript`, `jest`, `jest-expo`, `@react-native/jest-preset`,
`@testing-library/react-native`, `test-renderer`, `@types/jest`, `eslint`,
`eslint-config-expo`, `react-dom` (pinned to SDK 57's version only to satisfy a
peer dependency; it is never imported).

Infrastructure: Supabase project (or the Supabase CLI for local development),
PostgreSQL 15+ for the local SQL test runner, JDK 17+ and the Android SDK for local builds.

---

## 7. Risk assessment — Galaxy A15

Device profile: MediaTek Helio G99 (2× Cortex-A76 + 6× A55), Mali-G57 MC2,
4–8 GB RAM, 1080×2340 display at 90 Hz (≈11 ms per frame), Android 14+.

### Performance

| Risk | Impact | Mitigation |
| --- | --- | --- |
| JS-thread game loops drop frames at 90 Hz | Choppy games | Per-frame work runs in UI-thread worklets; React renders only on discrete events |
| Long lists (catalog, transactions, followers) | Scroll jank, memory | `FlatList` with fixed-height rows + `getItemLayout`, memoised rows, paginated queries |
| SVG avatars in lists | Slow list renders | Simplified avatar shapes, `React.memo` keyed by appearance hash, small viewBoxes |
| Re-render storms from global state | Sluggish UI | Zustand selectors, TanStack Query `select`, stable callbacks |
| Fonts / splash delays | Slow cold start | Fonts embedded at build time via the `expo-font` config plugin, minimal font weights |
| APK size | Slow install | No Skia, vector assets, release build for `arm64-v8a` + `armeabi-v7a` only |
| Low-memory process kill in background | Lost game run | Auto-pause on background, and runs are short; server sessions expire safely |

### Security

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Client tampering with balances / ownership | Fake currency | No client write grants on economy tables; RPCs validate and row-lock; constraints (`balance >= 0`) |
| Mis-configured RLS | Data leak / tampering | Explicit revoke + narrow grants; SQL test suite runs as `anon`/`authenticated` and asserts denials |
| Fabricated game scores | Inflated rewards | Server-clock rate limit, single submit, session expiry, per-run and daily caps. **Inherent limit:** a client-side game cannot be made cheat-proof, only bounded |
| Privilege escalation to developer | Arbitrary economy edits | Role only grantable via SQL by the project owner; every dev RPC checks it; full audit log |
| `SECURITY DEFINER` search-path hijack | Privilege escalation | `set search_path = ''` and schema-qualified names in every definer function |
| Token theft from device storage | Account takeover | Session in Android Keystore-backed SecureStore; refresh tokens rotate (Supabase default) |
| Secrets in the repo / APK | Compromise | Only the public anon key in the app; `.env` git-ignored; service-role key never used by the app |
| Confusion with real Roblox / money | User harm, legal | Original branding; BoxCoins labelled "simulated, no real value"; no real-money purchases; no external game connections |
