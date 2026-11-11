#!/usr/bin/env bash
# Runs the migration plus the RLS tests against a throwaway local Postgres.
# Needs Postgres binaries (initdb, pg_ctl, psql) on PATH, e.g. from Postgres.app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap 'pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$TMP"' EXIT

initdb -D "$TMP/data" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null

run() { psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
run -f "$ROOT/supabase/tests/supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run -f "$f"; done
run -f "$ROOT/supabase/tests/rls_test.sql"
