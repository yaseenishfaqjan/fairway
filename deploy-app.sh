#!/usr/bin/env bash
# One-shot deploy of the new Fairway360 (app.fairway360.io), side-by-side.
# Pass your keys as env vars — nothing to paste into an editor:
#
#   OPENAI_API_KEY='sk-...' RESEND_API_KEY='re_...' bash deploy-app.sh
#
# DB_PASSWORD and SESSION_SECRET are generated automatically. Re-running keeps
# your existing .env (so secrets stay stable) and just rebuilds/updates.
set -euo pipefail
cd "$(dirname "$0")"

: "${OPENAI_API_KEY:?Run as:  OPENAI_API_KEY=sk-... RESEND_API_KEY=re_... bash deploy-app.sh}"
: "${RESEND_API_KEY:?Run as:  OPENAI_API_KEY=sk-... RESEND_API_KEY=re_... bash deploy-app.sh}"
DOMAIN="${DOMAIN:-app.fairway360.io}"
EMAIL_FROM="${EMAIL_FROM:-Fairway360 <noreply@fairway360.io>}"
SALES_NOTIFY_EMAIL="${SALES_NOTIFY_EMAIL:-info@fairway360.io}"

if [ ! -f .env ]; then
  cat > .env <<EOF
DOMAIN=$DOMAIN
DB_PASSWORD=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)
LLM_PROVIDER=openai
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
ORDER_MODEL=gpt-4o
RESEND_API_KEY=$RESEND_API_KEY
EMAIL_FROM=$EMAIL_FROM
SALES_NOTIFY_EMAIL=$SALES_NOTIFY_EMAIL
EOF
  chmod 600 .env
  echo "[deploy] wrote .env (DB_PASSWORD + SESSION_SECRET auto-generated)"
else
  echo "[deploy] .env already exists — leaving secrets as-is"
fi

echo "[deploy] building image fairway360:v2 (a few minutes)..."
docker build -t fairway360:v2 ./fairway360

echo "[deploy] starting stack..."
docker compose -f docker-compose.app.yml --env-file .env up -d

echo "[deploy] waiting for DB..."
sleep 10
echo "[deploy] applying schema + seeding..."
docker compose -f docker-compose.app.yml exec -T app pnpm --filter @workspace/db push
docker compose -f docker-compose.app.yml exec -T app pnpm --filter @workspace/scripts seed || true

echo "[deploy] health check:"
docker exec fairway-v2-app node -e "fetch('http://localhost:5000/api/healthz').then(r=>r.text()).then(t=>console.log('   '+t)).catch(e=>console.log('   not-ready:',e.message))"

echo
echo "[deploy] DONE. App is running internally as fairway-v2-app:5000 on network fairwayv2net."
echo "         Next: wire the reverse proxy + SSL for https://$DOMAIN"
