# BloxyBox — Development status

_Last updated: 2026-11-14_

Legend: ✅ implemented and covered by automated tests · 🟡 implemented, needs on-device verification ·
⬜ not started / future work.

**Important:** no Android phone or emulator was available while building this
(the build machine has no hardware virtualisation). Everything below compiles,
type-checks, lints, bundles for Android and passes the automated suites, but
**nothing has yet been run on a real device.** Interactive behaviour (touch feel,
animation smoothness, keyboard handling, Android back/lifecycle) needs the manual
checklist in [`docs/TESTING.md`](docs/TESTING.md) on the Galaxy A15.

## Verification summary

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`, strict) | ✅ passes |
| ESLint (`npm run lint`, incl. React Compiler rules) | ✅ passes (one documented, narrowly scoped suppression in Box Stack) |
| Jest (`npm test`) | ✅ 56 tests in 4 suites pass |
| Database (`npm run test:db`, PostgreSQL 16) | ✅ 6 suites pass |
| Android JS bundle (`expo export --platform android`) | ✅ builds (Hermes bytecode, ~5.4 MB) |
| Release APK (Gradle, arm64-v8a) | ✅ builds; `aapt2`/`apksigner` verified (details in Phase 10) |
| Run on Galaxy A15 | ⬜ not yet done |

## Phase 1 — Inspection and architecture ✅
* Existing repository assessed (no reusable code; no Electron/desktop config to remove; existing files left untouched).
* Architecture, database schema, navigation, roadmap, dependency list, risk assessment: `docs/ARCHITECTURE.md`.

## Phase 2 — Foundation ✅
* Expo SDK 57 / RN 0.86 / TypeScript strict / Expo Router with protected route groups.
* Design system: tokens, Outfit font (embedded at build time), Button, Card, Badge, Input, Screen, list rows, chips, segmented control, progress, toasts, bottom sheets, loading/error/empty/skeleton states, offline banner.
* Original brand art (logo, BoxCoin) and launcher/adaptive/monochrome icons and splash.
* TanStack Query with an SQLite-persisted read cache, NetInfo online manager, AppState focus manager; Zustand stores.

## Phase 3 — Accounts and profiles ✅ / 🟡
* ✅ Sign up (username availability check, validation), sign in, sign out; server-side provisioning trigger.
* ✅ Session stored in Android Keystore-backed SecureStore (chunked); auto-refresh only in the foreground.
* ✅ Profiles: display name, bio, accent colour, username change; other players' profiles.
* ✅ Server setup screen (enter URL + anon key; refuses secret keys).
* 🟡 E-mail confirmation flow relies on the user confirming in a browser and then signing in (no deep link).
* ⬜ Password reset (needs e-mail template + deep link or OTP); not shown in the UI, so there are no dead buttons.

## Phase 4 — Economy and inventory ✅
* BoxCoins wallet, append-only ledger, a single server-side code path for every balance change (row-locked), `balance >= 0` constraint, tested ledger invariant.
* Welcome bonus, daily reward with streaks, game rewards; transaction history (paged) and detail screen.
* Inventory with ownership records, one equipped item per slot (RPC + unique index), free body customisation.
* Original SVG avatar system: 32 catalog items across 6 slots, 3 head shapes, 10 skin colours.

## Phase 5 — Marketplace and Game Passes ✅
* Shop with slot/rarity filters, search, five sort orders, hide-owned; item detail with "try it on"; confirmation sheet; server-validated purchase.
* 6 Game Passes (3 per game), purchase, ownership, enable/disable management; perks are read from the server for ranked runs.

## Phase 6 — Discover and social ✅
* Discover: Featured, Popular, New, In development; search and categories; experience detail with reward rules, passes and leaderboard.
* In-development experiences are labelled everywhere and can't be started.
* Follow/unfollow, friends (mutual follows), followers/following/friends lists, player search, profile visits, levels/XP.
* Simulated followers are always marked **SIM** and shown with a real-vs-simulated breakdown.

## Phase 7 — Mini-games ✅ / 🟡
* **Box Stack** (timing/stacking): UI-thread mover, touch-down drop, trimming, perfect drops with regrowth, win at 30 floors, debris and camera animation.
* **Lane Dash** (3-lane runner): seeded tracks with guaranteed escape lanes, UI-thread scrolling world and swept collision, swipe + tap controls, coins, shield and magnet perks, 2,000 m finish.
* GameShell: server session, 3-2-1 countdown, auto-pause on background and Android back, pause/restart/end, server-verified rewards with clear result screen, retry on failed submit, offline practice mode with SQLite personal bests.
* ✅ Rules, scoring, collisions and server-limit fit are unit-tested; both games mount in component tests.
* 🟡 Feel and frame rate on the A15 are unverified; tuning constants live in each `logic.ts`.

## Phase 8 — Developer tools ✅
* Hidden sequence (7 taps on the build number, then long-press the logo) only asks the server.
* `user_roles` table, grantable only via SQL; every `dev_*` RPC re-checks the role and writes `dev_audit_log`; denied probes logged.
* Modify Menu: target any player, set/adjust BoxCoins, edit simulated stats, grant/revoke items and passes, reset test data (typed confirmation), transaction log, audit log, client and server diagnostics (including a ledger consistency check).

## Phase 9 — Optimisation and QA 🟡
* Done: per-frame game work runs on the UI thread; list virtualisation with fixed row heights; memoised avatars keyed on appearance; Zustand selectors; query cache persisted for offline reads; mutations blocked offline with clear messages.
* Fixed during QA: missing `expo-asset` dependency (found by component tests; it would have crashed icon rendering at runtime); a possible crash during sign-out navigation (`useUserId`); a streak display bug after a missed day (server now returns `next_streak`).
* Not yet done: on-device profiling (memory, frame times), network-interruption testing on a real phone.

## Phase 10 — Release preparation ✅ / 🟡
* `scripts/build-apk.sh` (local Gradle build), `eas.json` (preview APK / production AAB), release-signing config plugin driven by environment variables, `.env.example`, README build and install instructions, `docs/RELEASE_CHECKLIST.md`.
* ✅ **Release APK built and verified** (2026-11-14): `dist/bloxybox-1.0.0-release-arm64.apk`, 46.5 MB,
  package `com.bloxybox.app`, versionName 1.0.0 / versionCode 1, minSdk 24, targetSdk 36, ABI arm64-v8a.
  Permissions: INTERNET, VIBRATE, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE (unused biometric permissions pulled in
  by expo-secure-store are explicitly removed). `apksigner verify` passes.
  **Signed with the debug key** because no upload keystore exists yet: installable on your own phone, not for distribution.
  No Supabase URL is baked in, so first launch shows the Server setup screen.
* Build notes from this environment: the sandbox's network rate-limited Maven Central, so Gradle was pointed at
  Google's official Maven Central mirror through a local init script (not part of the project), and JDK 17 had to be
  installed for React Native's Gradle toolchain. A normal developer machine needs neither workaround (only JDK 17).
* Size: R8 minification and resource shrinking are off (the Expo default). Turning them on would shrink the APK
  noticeably, but must be verified on a device first because R8 can strip classes used by native modules.

## Known limitations and decisions
* **Score tampering:** a client-side game can't be made cheat-proof. The server bounds abuse (server clock, rate limits, single submit, session expiry, per-run and daily caps) but can't prove a score was earned.
* **Keyboard handling** uses `KeyboardAvoidingView`; with Android 15+ edge-to-edge it may need `react-native-keyboard-controller`. Verify on device.
* **Signing:** without your own keystore, local release builds use the debug key (testing only).
* **Friend requests** are modelled as mutual follows, not request/accept.

## Next steps
1. Install the APK on the Galaxy A15 and run the manual checklist in `docs/TESTING.md`.
2. Create the Supabase project, apply migrations, grant yourself the developer role.
3. Tune game constants and fix anything found on device.
4. Then: password reset, more experiences (the registry makes this additive), achievements.
