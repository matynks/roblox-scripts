#!/usr/bin/env bash
# BloxyBox database test runner.
#
# Starts a throwaway PostgreSQL server, applies a small Supabase shim, every
# migration in supabase/migrations (in order) and the test helpers, then runs
# each supabase/tests/*.sql file in its own fresh copy of the database.
#
# Requirements: PostgreSQL 15+ server binaries (initdb, pg_ctl) and psql.
#   PG_BIN=/path/to/bin   override the PostgreSQL binary directory
#   PG_TEST_PORT=54329    override the port of the temporary server
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TESTS="$ROOT/supabase/tests"
PORT="${PG_TEST_PORT:-54329}"

if [[ -z "${PG_BIN:-}" ]]; then
  if command -v pg_config >/dev/null 2>&1 && [[ -x "$(pg_config --bindir)/initdb" ]]; then
    PG_BIN="$(pg_config --bindir)"
  else
    PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  fi
fi
if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then
  echo "PostgreSQL server binaries not found. Install PostgreSQL 15+ or set PG_BIN." >&2
  exit 2
fi

WORK="$(mktemp -d)"
RUN=()
# initdb refuses to run as root; use the postgres system account when present.
if [[ "$(id -u)" == "0" ]]; then
  if ! id postgres >/dev/null 2>&1; then
    echo "Running as root requires a 'postgres' system user (initdb refuses root)." >&2
    exit 2
  fi
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  ${RUN[@]+"${RUN[@]}"} "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

${RUN[@]+"${RUN[@]}"} "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust --no-sync >/dev/null
${RUN[@]+"${RUN[@]}"} "$PG_BIN/pg_ctl" -D "$WORK/data" -l "$WORK/server.log" -w \
  -o "-p $PORT -k $WORK -c listen_addresses='' -c fsync=off" start >/dev/null

PSQL=(psql -X -q -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 --set=VERBOSITY=terse)

echo "PostgreSQL $("${PSQL[@]}" -d postgres -Atc 'show server_version')"
"${PSQL[@]}" -d postgres -c "create database bloxybox_template" >/dev/null

echo "Applying Supabase shim"
"${PSQL[@]}" -d bloxybox_template -f "$TESTS/support/supabase_shim.sql" >/dev/null
for migration in "$MIGRATIONS"/*.sql; do
  echo "Applying migration $(basename "$migration")"
  "${PSQL[@]}" -d bloxybox_template -f "$migration" >/dev/null
done
"${PSQL[@]}" -d bloxybox_template -f "$TESTS/support/helpers.sql" >/dev/null

shopt -s nullglob
test_files=("$TESTS"/*.sql)
if (( ${#test_files[@]} == 0 )); then
  echo "No test files found in $TESTS" >&2
  exit 2
fi

passed=0
failed=0
failures=()
for test_file in "${test_files[@]}"; do
  name="$(basename "$test_file" .sql)"
  db="t_${name//[^a-zA-Z0-9]/_}"
  "${PSQL[@]}" -d postgres -c "create database \"$db\" template bloxybox_template" >/dev/null
  if output="$("${PSQL[@]}" -d "$db" -f "$test_file" 2>&1)"; then
    echo "  PASS  $name"
    passed=$((passed + 1))
  else
    echo "  FAIL  $name"
    echo "$output" | sed 's/^/        /'
    failed=$((failed + 1))
    failures+=("$name")
  fi
  "${PSQL[@]}" -d postgres -c "drop database \"$db\"" >/dev/null
done

# The read-only verification script must pass on a fully migrated database ...
echo "Checking supabase/checks/verify.sql"
"${PSQL[@]}" -d postgres -c "create database t_verify template bloxybox_template" >/dev/null
verify_out="$("${PSQL[@]}" -d t_verify -At -F '|' -f "$ROOT/supabase/checks/verify.sql" 2>&1)" || true
if grep -q '|FAIL|' <<<"$verify_out" || grep -qi 'error' <<<"$verify_out"; then
  echo "  FAIL  verify.sql on a migrated database"; echo "$verify_out" | sed 's/^/        /'; failed=$((failed + 1)); failures+=("verify_migrated")
else
  echo "  PASS  verify.sql reports PASS on a migrated database"; passed=$((passed + 1))
fi
# ... must detect tampering (a dropped policy and an illegal grant) ...
"${PSQL[@]}" -d t_verify -c "drop policy wallets_read_own on public.wallets; grant insert on public.wallets to authenticated;" >/dev/null
verify_out="$("${PSQL[@]}" -d t_verify -At -F '|' -f "$ROOT/supabase/checks/verify.sql" 2>&1)" || true
if grep -q '09 RLS policies|FAIL' <<<"$verify_out" && grep -q '10 table privileges.*|FAIL|.*authenticated can insert wallets' <<<"$verify_out"; then
  echo "  PASS  verify.sql detects a dropped policy and an illegal grant"; passed=$((passed + 1))
else
  echo "  FAIL  verify.sql missed tampering"; echo "$verify_out" | sed 's/^/        /'; failed=$((failed + 1)); failures+=("verify_tamper")
fi
"${PSQL[@]}" -d postgres -c "drop database t_verify" >/dev/null
# ... and must fail (not crash) on a project where nothing was applied.
"${PSQL[@]}" -d postgres -c "create database t_empty" >/dev/null
# Roles are cluster-wide and already exist; an empty Supabase project only needs auth.users.
"${PSQL[@]}" -d t_empty -c "create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()); insert into auth.users (email) values ('someone@example.com');" >/dev/null
verify_out="$("${PSQL[@]}" -d t_empty -At -F '|' -f "$ROOT/supabase/checks/verify.sql" 2>&1)" || true
preflight_out="$("${PSQL[@]}" -d t_empty -At -F '|' -f "$ROOT/supabase/checks/preflight.sql" 2>&1)" || true
if grep -q '01 tables exist|FAIL' <<<"$verify_out" && ! grep -qi 'error' <<<"$verify_out" \
   && ! grep -q 'CONFLICT' <<<"$preflight_out" && ! grep -qi 'error' <<<"$preflight_out"; then
  echo "  PASS  verify.sql fails and preflight.sql is clean on an empty project"; passed=$((passed + 1))
else
  echo "  FAIL  checks on an empty project"; echo "$verify_out" "$preflight_out" | sed 's/^/        /'; failed=$((failed + 1)); failures+=("verify_empty")
fi
"${PSQL[@]}" -d postgres -c "drop database t_empty" >/dev/null

echo
echo "Database tests: $passed passed, $failed failed"
if (( failed > 0 )); then
  printf 'Failed: %s\n' "${failures[@]}"
  exit 1
fi
