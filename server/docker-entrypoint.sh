#!/bin/sh
set -e

echo "[entrypoint] applying database migrations…"
node dist/db/migrate.js

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  echo "[entrypoint] seeding database (idempotent — skips if already populated)…"
  node dist/db/seed.js
fi

echo "[entrypoint] starting server: $*"
exec "$@"
