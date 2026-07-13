#!/usr/bin/env bash
# Point fairway360.io (+ www) at the NEW app (fairway-v2-app) in the shared
# nginx proxy, so the main domain serves the new version. Safe: backs up the
# config, validates with `nginx -t`, and reverts automatically if invalid.
# The old fairway360-app stack keeps running (idle) until you choose to stop it.
set -euo pipefail

NGINX=$(docker ps --filter "publish=443" --format '{{.Names}}' | head -1)
[ -z "$NGINX" ] && { echo "!! No :443 proxy container found."; exit 1; }
CONF=$(docker inspect "$NGINX" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d/default.conf"}}{{.Source}}{{end}}{{end}}')
[ -z "$CONF" ] && { echo "!! Could not find the nginx conf mount."; exit 1; }
echo "[cutover] proxy=$NGINX  conf=$CONF"

if ! grep -q "fairway360-app:5000" "$CONF"; then
  echo "[cutover] Nothing to do — fairway360.io does not point at the old app (fairway360-app)."
  exit 0
fi

BAK="${CONF}.bak.$(date +%s)"
cp "$CONF" "$BAK"
echo "[cutover] backed up -> $BAK"

# Repoint every fairway360-app upstream to the new container.
sed -i 's#http://fairway360-app:5000#http://fairway-v2-app:5000#g' "$CONF"

if docker exec "$NGINX" nginx -t; then
  docker exec "$NGINX" nginx -s reload
  echo "[done] fairway360.io + www.fairway360.io now serve the NEW app (fairway-v2-app)."
  echo "       Old stack still running idle; stop it later with:"
  echo "       docker compose -f /root/fairway360/docker-compose.vps.yml down"
else
  echo "[error] nginx config invalid — reverting."
  cp "$BAK" "$CONF"
  docker exec "$NGINX" nginx -s reload || true
  exit 1
fi
