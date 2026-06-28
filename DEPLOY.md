# Deploying Fairway360 to a VPS

This deploys the whole app as three Docker containers — **app** (API + built SPA on one port), **db** (PostgreSQL with a persistent volume), and **caddy** (reverse proxy with automatic HTTPS). You only need a VPS, a domain, and ~10 minutes.

---

## Option B (recommended for low-disk VPS): pull a pre-built image

Instead of cloning the repo and building on the server, build the image once on
your workstation, push it to a registry, and just **pull** it on the VPS. Nothing
is compiled on the server.

**On your workstation**
```bash
docker build -t <user>/fairway360:latest ./fairway360
docker login
docker push <user>/fairway360:latest          # use a PRIVATE repo — the image contains source
```

**Copy only three files to the VPS** (no repo needed):
```bash
ssh root@YOUR_VPS_IP "mkdir -p /root/fairway360"
scp docker-compose.prod.yml Caddyfile .env root@YOUR_VPS_IP:/root/fairway360/
```
Set `APP_IMAGE=<user>/fairway360:latest` in that `.env`.

**On the VPS**
```bash
cd /root/fairway360
docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':80->|:443->' || echo "ports 80/443 free"
docker login                                   # so it can pull the private image
docker pull "$(grep ^APP_IMAGE= .env | cut -d= -f2)"
docker compose -f docker-compose.prod.yml up -d --no-build
docker compose -f docker-compose.prod.yml exec app pnpm --filter @workspace/db push
docker compose -f docker-compose.prod.yml exec app pnpm --filter @workspace/scripts seed
```
To ship an update later: rebuild + push the image on your workstation, then on the
VPS `docker pull … && docker compose -f docker-compose.prod.yml up -d --no-build`.

---

## Option A: build on the server (original)


## 0. What you need first

- A **VPS** running Ubuntu 22.04+ (2 GB RAM minimum, 4 GB recommended for the build).
- A **domain** (e.g. `club.example.com`).
- Optionally, **API keys** (Anthropic / Resend / Twilio / Stripe). The app runs fine without them.

---

## 1. Point your domain at the VPS

In your DNS provider, create an **A record** for your domain → the VPS public IP.
(For a root domain also add the `www` or apex record as your registrar requires.)

DNS must resolve **before** step 5, or Caddy can't issue the TLS certificate.

---

## 2. Install Docker on the VPS

```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://get.docker.com | sh
```

Docker Compose v2 is included with modern Docker.

---

## 3. Get the code

```bash
git clone https://github.com/yaseenishfaqjan/fairway.git
cd fairway
```

(Private repo: use a deploy key or a GitHub Personal Access Token when prompted.)

---

## 4. Configure environment

```bash
cp .env.prod.example .env
nano .env
```

Set at minimum:
- `DOMAIN` — your domain from step 1
- `DB_PASSWORD` — a strong password
- `SESSION_SECRET` — a 64-char random string (`openssl rand -hex 32`)

Fill in any integration keys you have. The real `.env` is gitignored — never commit it.

---

## 5. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes (installs deps, builds API + SPA). Caddy automatically requests a Let's Encrypt certificate for `DOMAIN`.

Check everything is up:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app   # Ctrl-C to stop tailing
```

---

## 6. Create the database schema + seed

The database starts empty. Push the Drizzle schema, then seed a tenant:

```bash
# create all tables
docker compose -f docker-compose.prod.yml exec app pnpm --filter @workspace/db push

# seed demo data (Augusta Pines + the demo logins)
docker compose -f docker-compose.prod.yml exec app pnpm --filter @workspace/scripts seed
```

`DATABASE_URL` is already in the app container's environment, so both commands target the production database.

---

## 7. You're live

Open `https://YOUR_DOMAIN`. Demo logins (password `Password123!`):

| Role       | Email                     |
| ---------- | ------------------------- |
| Member     | `james@augustapines.com`  |
| Employee   | `maria@augustapines.com`  |
| Supervisor | `carlos@augustapines.com` |

If you enabled Stripe, set the webhook endpoint in the Stripe dashboard to
`https://YOUR_DOMAIN/api/stripe/webhook`.

---

## Day-2 operations

**Deploy an update**
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
# run `db push` again only if the schema changed
```

**Back up the database**
```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U fairway fairway360 > backup_$(date +%F).sql
```

**Restore**
```bash
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U fairway -d fairway360
```

**Logs / restart / stop**
```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml down        # stop (keeps the db volume)
```

---

## Notes & troubleshooting

- **TLS fails to issue** → DNS isn't pointing at the VPS yet, or ports 80/443 are blocked by the firewall. Open them (`ufw allow 80,443/tcp`) and check `docker compose logs caddy`.
- **Build runs out of memory** on a 2 GB box → add swap (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`) or use a 4 GB plan.
- **Data persists** in the `pgdata` Docker volume across restarts and rebuilds. `down -v` would delete it — don't use `-v` unless you mean it.
- Integrations are env-gated: add the relevant keys to `.env` and `docker compose up -d` to enable them with no code changes.
