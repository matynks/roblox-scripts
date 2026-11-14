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

echo
echo "Database tests: $passed passed, $failed failed"
if (( failed > 0 )); then
  printf 'Failed: %s\n' "${failures[@]}"
  exit 1
fi
