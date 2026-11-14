# BloxyBox — Database setup and verification

If the app says **"Connected, but the BloxyBox database is not set up on this project
yet"**, your Supabase project is reachable but the BloxyBox migrations have not been
applied. Technically: the app calls the `is_username_available` function through
Supabase's REST API and gets `404 PGRST202` (function not found), because the function
is created by the migrations.

Everything below is **non-destructive**. Nothing here resets, drops or overwrites
existing data, and nothing here requires putting a secret key in the app. The app only
ever uses the public anon/publishable key.

---

## 1. The migrations (apply in this order)

All files are in `bloxybox/supabase/migrations/`. The CLI applies them in filename order.

| # | File | Creates |
| --- | --- | --- |
| 1 | `20261114000100_core_schema.sql` | 18 tables, constraints, indexes, Row Level Security, policies, client privileges (read-only) |
| 2 | `20261114000200_core_functions.sql` | Ledger function, sign-up trigger on `auth.users`, profile/avatar RPCs, daily reward |
| 3 | `20261114000300_market_and_passes.sql` | Item purchase, equip/unequip, Game Pass purchase and toggle |
| 4 | `20261114000400_games.sql` | Game sessions, server-validated rewards, leaderboard |
| 5 | `20261114000500_social.sql` | Follows, profile summary, connections, player search, profile visits |
| 6 | `20261114000600_dev_tools.sql` | Developer role checks, Modify Menu RPCs, audit log |
| 7 | `20261114000700_catalog.sql` | Items, marketplace prices, experiences, Game Passes (catalog data) |
| 8 | `20261114000800_backfill_existing_users.sql` | Gives accounts that existed before BloxyBox a profile and wallet (insert-only) |

Not migrations, never run these on Supabase: `supabase/tests/**` (local test suite and a
test-only shim that creates roles) and `supabase/checks/*.sql` (read-only checks, see §4).

---

## 2. Before you start: run the preflight check (read-only)

Supabase's "User Management" quickstart creates a `public.profiles` table, a
`handle_new_user()` function and an `on_auth_user_created` trigger, the same names
BloxyBox uses. The preflight check tells you if your project has any of these.

* **SQL Editor:** Dashboard → SQL Editor → paste `supabase/checks/preflight.sql` → Run.
* **CLI** (after linking, see §3): `npx supabase db query --remote --read-only -f supabase/checks/preflight.sql`

Every row should be `OK` (or `INFO`). If any row says **`CONFLICT`**, stop: the
migrations would refuse to run, and nothing would be changed. Don't drop anything to
"make it work"; decide what to do with that existing data first.

---

## 3. Apply the migrations

### Option A: Supabase CLI (recommended)

The CLI records what it applied, so re-running it only applies new migrations.
Run these on **your own computer** from the `bloxybox/` folder (Node 20+). The CLI
is pinned as a dev dependency, so `npx supabase` uses the tested version (3.1.0).

```bash
cd bloxybox
npm install

# 1. Log in (opens the browser, or use --token with a personal access token).
#    The token stays in the CLI on your computer; it is never used by the app.
npx supabase login

# 2. Link this folder to your project. <project-ref> is the part of your project URL
#    before ".supabase.co". You will be asked for your DATABASE password
#    (Dashboard -> Project Settings -> Database). It is not stored in the repository.
npx supabase link --project-ref <project-ref>

# 3. Read-only checks: what is already there, and what would be applied.
npx supabase db query --remote --read-only -f supabase/checks/preflight.sql
npx supabase migration list --remote
npx supabase db push --remote --dry-run

# 4. Apply. Only migrations missing from the project's history are applied.
npx supabase db push --remote
```

> **CLI v3 note:** `supabase db push` without `--remote` targets your *local*
> development database, not your project. Always include `--remote` for your project.

What `db push` does and doesn't do (verified on a real Supabase stack, see §6):
* It applies only migrations not yet recorded in `supabase_migrations.schema_migrations`.
  Running it again later is a no-op ("up to date").
* Each migration file runs in a transaction. If one fails (for example because of a
  conflict), that file is rolled back completely, nothing after it runs, and your
  existing data is untouched.
* It never drops or empties existing tables. **Never** run `supabase db reset --remote`
  (that *does* wipe the database). Don't use `--include-all` or `migration repair`
  unless you know exactly why.

### Option B: SQL Editor (no CLI)

1. Dashboard → SQL Editor → New query.
2. Open `20261114000100_core_schema.sql`, paste the **entire** file, click **Run**,
   and wait for "Success".
3. Repeat for files 2 to 8, **in order**, one file at a time.
4. If a file reports an error, stop and don't continue with the next file. Postgres
   executes a multi-statement request as one transaction, so a failed file should leave
   nothing behind. Run the preflight check (§2) again to confirm before retrying.

The SQL editor doesn't write CLI migration history. If you later switch to the CLI,
first mark these as applied without re-running them:
`npx supabase migration repair --status applied 20261114000100 20261114000200 … 20261114000800`.

---

## 4. Verify the result (read-only)

Run `supabase/checks/verify.sql`:

* **CLI:** `npx supabase db query --remote --read-only -f supabase/checks/verify.sql`
* **SQL Editor:** paste the file and click Run.

Expected result: every row `PASS`. Row 15 may show `WARN` if you used the SQL editor.

| Check | What it confirms |
| --- | --- |
| 01–02 | All 18 tables exist and every one has Row Level Security enabled |
| 03 | All 139 columns exist with the right types and nullability |
| 04–05 | All 108 constraints (primary keys, foreign keys, unique, checks) and 37 indexes |
| 06–07 | All 48 functions with exact signatures; every SECURITY DEFINER function pins `search_path` |
| 08 | The sign-up trigger `on_auth_user_created` exists on `auth.users`, is enabled and calls `public.handle_new_user()` |
| 09 | All 14 RLS policies, with the right table, command and roles |
| 10 | Clients are read-only: anon has no table access; signed-in users can read exactly 14 tables and write none |
| 11 | Function allow-lists: anon can call only `is_username_available`; signed-in users can call exactly the 36 app RPCs and none of the internal ones |
| 12 | Catalog data: 32 items, 29 listings, 2 playable experiences, 6 Game Passes |
| 13 | Every existing account has a BloxyBox profile |
| 14–15 | Schema version `20261114000800`; all 8 migrations in the CLI history |

Then check what the app sees:

* Open BloxyBox, enter the project URL and anon key on the setup screen and tap
  **Connect**. It should continue to the welcome screen.
* Or from a terminal, with the **public anon key** (never the service_role key):
  ```bash
  curl -s -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/is_username_available" \
    -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" \
    -H "Content-Type: application/json" -d '{"p_username":"connection_check"}'
  ```
  Expected output: `true`. A `PGRST202` error means the migrations are not applied
  to *this* project (check you linked the same project the app points at).

---

## 5. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| App still says "not set up" after applying | Check that the app and the CLI use the same project ref. If you applied SQL by hand, refresh the API schema cache: run `notify pgrst, 'reload schema';` in the SQL editor. |
| `relation "profiles" already exists` / trigger or function already exists | Your project has objects with BloxyBox's names (see §2). Nothing was applied. Keep your data; ask for a migration that renames or adapts instead. |
| `password authentication failed` during `link`/`push` | Use the database password (Project Settings → Database → reset it there if needed), not an API key. |
| Connection timeouts on `link`/`push` | The CLI uses Supabase's connection pooler by default, which works on IPv4. Check firewalls/VPN, or try again. |
| `Remote database is up to date` | Already applied; run the verification in §4. |

---

## 6. How this was tested

* `npm run test:db` (plain PostgreSQL 16 plus a Supabase shim): 7 SQL suites, plus
  checks that `verify.sql` passes on a migrated database, catches tampering (a dropped
  policy, an illegal grant), and fails cleanly on an empty project, and that
  `preflight.sql` is clean on an empty project.
* A real local Supabase stack (Supabase CLI 3.1.0, `supabase/postgres:17.11.0.018`,
  Auth, REST API), treated like an existing project:
  * the app's setup probe reproduced `404 PGRST202` before migrating;
  * the preflight flagged a quickstart-style `profiles` table, function and trigger;
    `db push` then failed with nothing applied and the existing data intact;
  * a conflict halfway through migration 1 rolled the whole file back;
  * on a project with an unrelated table and an existing account, `db push --remote`
    applied all migrations; the unrelated rows were untouched and the existing account
    received a profile and wallet; a second push was a no-op;
  * `verify.sql`: all 15 checks PASS;
  * `scripts/api-smoke-test.mjs` (supabase-js, as the app uses it): 37/37 PASS;
  * the setup probe returns 200 with both the classic anon key and the `sb_publishable_` key.
