# Project Audit

Audit of the existing repository `matynks/roblox-scripts` (branch `main` at `2c5fd13`) carried out before any development, plus the build-environment audit that shaped the architecture.

## 1. Repository inventory (before this work)

| Path | What it is | Relevance to the simulator |
|---|---|---|
| `index.html` | Single static page "MATYÁŠ HUB V2": a script-hub card with a particle background and a "copy loadstring" button | Unrelated. Not an app, no backend |
| `rivals.lua` | One line that `loadstring`s a third-party script from another GitHub account | Unrelated. A client-side script for a third-party Roblox game; nothing in it is reusable, and the simulator neither uses nor links it |
| `exit-code-360/` | A Remotion (React + TypeScript) animated-video production project with docs, rig, render tooling and a rendered MP4 | Unrelated. A separate, working project with its own `package.json` |

Findings against the audit checklist:

| Checklist item | Status |
|---|---|
| Android application | **None** |
| Application architecture | None for an app (only a static page and a video project) |
| Package dependencies | Only `exit-code-360/package.json` (Remotion 4, React 19) |
| Database schema / migrations | **None** — no `supabase/` directory, no SQL |
| Authentication | **None** |
| Supabase integration | **None** — no client, keys or project reference anywhere in history (`git log -p` searched) |
| Existing UI | Static HTML page only |
| Existing tests | None (the video project has QA render scripts only) |
| Build configuration | Remotion render scripts only |
| Environment configuration | None (`.env` files absent) |

## 2. Decision

There was no existing simulator to preserve or migrate, so this is **additive, not a rewrite**:

* The simulator lives in a new self-contained directory, `game-account-simulator/`.
* `index.html`, `rivals.lua` and `exit-code-360/` are **left untouched**. Nothing was deleted or moved.
* No existing data exists, so there is no data-migration risk.

## 3. Build-environment audit

| Capability | Result | Impact |
|---|---|---|
| Node 22, npm 10 | Available | Expo SDK 58 / React Native 0.88 toolchain |
| npm registry | Reachable | Dependencies install normally |
| `api.expo.dev`, `docs.expo.dev` | **Blocked** | `expo install` must run with `EXPO_OFFLINE=1` (uses the SDK's bundled version map). APIs were verified against installed `.d.ts` files, not online docs |
| Android SDK (dl.google.com), Google Maven, Maven Central, Gradle | Reachable | Local Gradle APK build is possible |
| `/dev/kvm` | Absent | No Android emulator: the APK is compiled and inspected, UI is exercised on the web build |
| Docker | Available | Full **local Supabase stack** (`supabase start`) for real end-to-end tests |
| Supabase CLI 3.1.0 | Installed (npm) | Migrations, seed and db reset run locally |
| `api.supabase.com` (hosted management API) | **Blocked**, and no project credentials provided | Hosted project cannot be created or migrated from here — see `SUPABASE_SETUP.md` |
| roblox.com, zlarp.com | **Blocked** | Research done through search-indexed summaries (see `REFERENCE_SPECIFICATION.md` §0) |

## 4. Prioritized implementation plan

| Priority | Work | Why first |
|---|---|---|
| P0 | Supabase schema, RLS, `SECURITY DEFINER` RPCs for every privileged action, seed content | Everything depends on a secure economy |
| P0 | Auth (register, login, persistence, recovery, expiry) | Gate for the whole app |
| P0 | Backend abstraction + offline (on-device) backend | Without a hosted project, the APK must still be fully playable |
| P1 | Navigation shell, design system, Home/Profile | Coherent product frame |
| P1 | Marketplace → inventory → avatar editor → outfits | Core loop: earn → buy → wear |
| P1 | Discover, game details, 4 mini-game engines, rewards, passes | Core loop: play → earn |
| P2 | Social graph, notifications, feed, privacy, block/report | Platform feel |
| P2 | Modify Menu (server-authorized) | Developer tooling |
| P3 | Original systems: streaks, quests, levels, collections, limited serials, events, trending, analytics | Differentiation |
| P3 | Test suites, web e2e, APK build | Verification |

## 5. Architectural risks identified

| Risk | Mitigation |
|---|---|
| No hosted Supabase credentials | Build-time configuration (`EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY`); without them the app runs its **offline backend**, never a config screen |
| Client tampering with currency | No client `INSERT/UPDATE` grants on wallets, ledger, inventory, ownership; all writes via RPCs that lock rows and validate |
| Duplicate purchases on flaky networks | Client generates an idempotency key per purchase intent; server enforces `unique(user_id, idempotency_key)` and returns the original result on retry |
| Two backends drifting apart | Shared content (catalog, games, achievements) generated from one TypeScript source into `seed.sql`; shared rule tables tested against SQL |
| Expo API churn (SDK 58) | Verified against installed type definitions; `tsc` + `expo export` + Gradle build as gates |
