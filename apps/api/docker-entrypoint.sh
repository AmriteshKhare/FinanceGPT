#!/bin/sh
set -eu

echo "[finance-api] starting entrypoint"
echo "[finance-api] node=$(node -v) cwd=$(pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[finance-api] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

if [ -z "${SESSION_SECRET:-}" ]; then
  echo "[finance-api] ERROR: SESSION_SECRET is not set" >&2
  exit 1
fi

echo "[finance-api] running migrations"
node packages/db/dist/migrate.js

echo "[finance-api] starting HTTP server"
exec node apps/api/dist/index.js
