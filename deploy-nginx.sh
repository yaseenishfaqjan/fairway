#!/usr/bin/env bash
# Wire the running fairway-v2-app into an existing shared nginx reverse proxy
# and get an HTTPS cert for the domain. Idempotent + auto-detects the nginx
# container and its config file. Run AFTER deploy-app.sh.
#
#   bash deploy-nginx.sh
#
# Override defaults with env vars if needed:
#   DOMAIN=app.fairway360.io APP_CONTAINER=fairway-v2-app APP_NET=fairwayv2net bash deploy-nginx.sh
set -euo pipefail

DOMAIN="${DOMAIN:-app.fairway360.io}"
APP_CONTAINER="${APP_CONTAINER:-fairway-v2-app}"
APP_NET="${APP_NET:-fairwayv2net}"
EMAIL="${CERT_EMAIL:-info@fairway360.io}"

# The reverse-proxy container is whichever one publishes :443.
NGINX=$(docker ps --filter "publish=443" --format '{{.Names}}' | head -1)
[ -z "$NGINX" ] && { echo "!! No container is publishing :443 — can't find the reverse proxy."; exit 1; }
echo "[nginx] proxy container: $NGINX"

# Host path of the config file mapped to conf.d/default.conf inside nginx.
CONF=$(docker inspect "$NGINX" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d/default.conf"}}{{.Source}}{{end}}{{end}}')
[ -z "$CONF" ] && { echo "!! Could not locate the nginx conf mount (/etc/nginx/conf.d/default.conf)."; exit 1; }
echo "[nginx] config file: $CONF"

# 1) Let nginx reach the app container.
docker network connect "$APP_NET" "$NGINX" 2>/dev/null && echo "[nginx] connected to $APP_NET" || echo "[nginx] already on $APP_NET"

# 2) HTTP (ACME challenge + redirect) block — add once.
mkdir -p /etc/letsencrypt/www
if ! grep -q "server_name ${DOMAIN};" "$CONF"; then
  cat >> "$CONF" <<EOF

# ── ${DOMAIN} (Fairway360) — HTTP / ACME ──
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /etc/letsencrypt/www; }
    location / { return 301 https://\$host\$request_uri; }
}
EOF
  docker exec "$NGINX" nginx -t && docker exec "$NGINX" nginx -s reload
  echo "[nginx] HTTP/ACME block added + reloaded"
else
  echo "[nginx] HTTP block already present"
fi

# 3) Obtain the certificate (webroot) if we don't have it yet.
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  echo "[cert] requesting certificate for ${DOMAIN}..."
  docker run --rm -v /etc/letsencrypt:/etc/letsencrypt \
    certbot/certbot certonly --webroot -w /etc/letsencrypt/www \
    -d "${DOMAIN}" --email "${EMAIL}" --agree-tos --no-eff-email -n
  echo "[cert] issued"
else
  echo "[cert] certificate already exists"
fi

# 4) HTTPS block proxying to the app — add once.
if ! grep -q "ssl_certificate .*/${DOMAIN}/fullchain.pem" "$CONF"; then
  cat >> "$CONF" <<EOF

# ── ${DOMAIN} (Fairway360) — HTTPS ──
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 15m;
    location / {
        proxy_pass http://${APP_CONTAINER}:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection        "";
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
EOF
  echo "[nginx] HTTPS block added"
else
  echo "[nginx] HTTPS block already present"
fi

docker exec "$NGINX" nginx -t && docker exec "$NGINX" nginx -s reload
echo
echo "[done] https://${DOMAIN} is live — open it in your browser."
