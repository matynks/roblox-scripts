# BloxyBox — Testing strategy

Three layers, from fastest to slowest. The first two run in CI or on any machine;
the third needs a real phone.

## 1. Automated: Jest (`npm test`)

| Area | File | What is verified |
| --- | --- | --- |
| Formatting | `src/__tests__/lib.test.ts` | Number grouping, compact numbers, signed ledger amounts, relative times, countdowns |
| Error mapping | `lib.test.ts` | Server codes → messages; auth, permission, network and unknown errors |
| Backend config | `lib.test.ts` | https only (http for private hosts), refuses `service_role` and `sb_secret_` keys, rejects malformed input |
| Session storage | `lib.test.ts` | Chunked SecureStore round-trip, stale chunk clean-up, partial writes treated as missing, key sanitising |
| Auth forms | `features.test.ts` | Username/email/password rules mirror the database |
| Hidden sequence | `features.test.ts` | Arms only on 7 quick taps; long-press must follow within the window |
| Dev actions | `features.test.ts` | Each Modify Menu action maps to the right RPC and arguments |
| Marketplace | `features.test.ts` | Filter by slot, rarity, text, ownership; all sort orders; no input mutation |
| Discover | `features.test.ts` | Featured/Popular/New/In development; in-development titles never listed as playable |
| Box Stack | `games.test.ts` | Base width and perks, perfect/trim/miss rules, regrowth, win at 30 floors, mover bounds, speed curve, frame-perfect run fits the server limits |
| Lane Dash | `games.test.ts` | Deterministic tracks, a free and reachable lane in every row, no coin on a barrier, speed ramp, swept collisions, shield, coin magnet, scoring, a perfect run fits the server limits |
| Catalog | `games.test.ts` | Every catalog item has artwork for its slot; every playable experience has an implementation |
| Components | `components.test.tsx` | Button press/disabled, CoinAmount a11y label, every avatar asset in every head shape, purchase sheet blocks unaffordable buys, SIM labelling of followers, both games mount |

## 2. Automated: database (`npm run test:db`)

Runs against a real PostgreSQL server with a shim that reproduces Supabase's roles,
JWT claim handling (`auth.uid()`) and its broad default grants. Tests run **as the
`anon` and `authenticated` roles**, so they exercise RLS and privileges exactly as a
client would.

| Suite | Highlights |
| --- | --- |
| `01_security` | Anonymous clients can read no table; authenticated clients can write no table (wallet, ledger, inventory, ownership, roles, follows, prices, stats); internal functions not callable; exact allow-lists of callable functions for `anon` and `authenticated`; every SECURITY DEFINER function pins `search_path`; RLS on every table; private rows isolated |
| `02_accounts_and_economy` | Sign-up provisioning (wallet + welcome bonus, starter items, stats, avatar); username fallback; profile and avatar validation; daily reward once per UTC day, streaks and resets; overdraft and zero-amount rejection; ledger invariant |
| `03_marketplace_and_passes` | Purchase debits and records ownership; no double purchase; unaffordable and inactive listings rejected with nothing granted; one equipped item per slot (RPC and unique index); Game Pass purchase and enable/disable |
| `04_games` | Session start rules; rewards computed server-side; double submit, foreign sessions, implausible rates, fake wins and expired sessions rejected and recorded; Double Coins applied only when enabled; daily cap; level-up simulated followers; leaderboard |
| `05_social` | Follow/unfollow, no self-follow, friends = mutual follows, simulated vs real follower totals, connection lists, literal search (wildcards escaped), one counted visit per visitor per day |
| `06_dev_tools` | Every developer RPC rejects normal users and changes nothing; the denied probe is logged; developer actions work, are ledgered and audited; reset restores starter state; diagnostics report ledger consistency; revoking the role takes effect immediately |

## 2b. Database rollout checks

* `supabase/checks/preflight.sql` (read-only): finds name conflicts before pushing to an existing project.
* `supabase/checks/verify.sql` (read-only): 15 check groups covering tables, RLS, columns, constraints,
  indexes, functions, the Auth trigger, policies, privileges, catalog data, profiles for all accounts,
  schema version and migration history. The DB runner proves it passes on a migrated database, detects
  tampering and fails cleanly on an empty one.
* `npm run test:api` (`scripts/api-smoke-test.mjs`): 37 checks with supabase-js against a **local**
  Supabase stack (`npx supabase start`): sign-up trigger, RLS, purchases, passes, games, social,
  locked developer tools. It refuses to run against a hosted project.
* `07_backfill` SQL suite: accounts created before BloxyBox get a profile and wallet; idempotent; existing players untouched.

## 3. Static checks

* `npm run typecheck`: strict TypeScript with `noUncheckedIndexedAccess`.
* `npm run lint`: Expo's ESLint config including the React Compiler rules.
* `npx expo export --platform android`: proves the whole app bundles for Android (Metro + Hermes).

## 4. Manual: on the Galaxy A15

Neither an Android emulator nor a phone was available while BloxyBox was built
(the build machine has no KVM), so the items below are **not yet verified on a
device**. Run them on the Galaxy A15 before calling a release done.

**Install & start**
- [ ] APK installs; launcher icon and splash look right; cold start under ~3 s.
- [ ] Setup screen accepts the project URL + anon key and rejects a service_role key.

**Accounts**
- [ ] Sign up (with and without e-mail confirmation), sign in, sign out, wrong password message.
- [ ] Kill and reopen the app: still signed in. Sign out, sign in as another user: no data from the first user.

**Economy & items**
- [ ] Welcome balance 500; daily reward claim, second claim blocked, countdown shown.
- [ ] Buy an item, see balance drop and a transaction; try buying something too expensive.
- [ ] Equip/unequip in the Avatar tab; change skin colour and head shape.
- [ ] Buy a Game Pass, toggle it off/on in My Game Passes.

**Games**
- [ ] Box Stack: taps feel instant, the box drops where it was shown, perfect drops highlight, the run ends on a miss, a win at 30 floors.
- [ ] Lane Dash: swipe and tap lane changes, coins collect, a crash ends the run, the finish line wins, Second Wind saves one crash.
- [ ] Rewards arrive and match the result screen; the daily cap message appears when reached.
- [ ] Press Home mid-run: the game pauses. Android back mid-run: the pause menu opens.
- [ ] Airplane mode: Start runs practice mode with no reward.
- [ ] Smoothness at 90 Hz: no visible stutter in either game (enable *Profile HWUI rendering* in developer options).

**Social**
- [ ] Find a second account, follow it, follow back → both show as friends; profile visits counted once per day.

**Offline**
- [ ] Airplane mode after browsing: screens show cached data with the offline banner; purchases explain they need a connection.

**Developer tools**
- [ ] The hidden sequence does nothing for a normal account.
- [ ] With the developer role: set and adjust balance, edit stats, grant and revoke items and passes, reset test data, view logs and diagnostics; every action appears in the audit log.
