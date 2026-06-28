# Operations & Known Limitations

Practical notes for running Fairway360 in production. Pairs with [DEPLOY.md](DEPLOY.md).

## Architecture at a glance

- **One app container** serves both the API and the built SPA on port 5000.
- **Postgres** holds all data **and** the session store (`connect-pg-simple`), so logins survive restarts.
- **Caddy** terminates HTTPS (auto Let's Encrypt) and reverse-proxies to the app.
- **Realtime** is in-process Server-Sent Events (no external broker).

## Known limitations (by design — fine for a single VPS)

| Area | Limitation | Impact / when to revisit |
| --- | --- | --- |
| Presence, delegation, AI cost-guards, rate-limits | Held **in memory** | Reset on restart/redeploy; assume **one app instance**. Move to Redis only if you run multiple app containers. |
| Realtime (SSE) | In-process EventEmitter | Works for one instance; multiple instances wouldn't share events (needs Redis pub/sub). |
| Escalation detection | Keyword/regex based | Can occasionally mis-tag; upgrade to an LLM classifier later if needed. |
| Tenancy | One club seeded; no self-serve "create club" UI | Add tenants by running the seed/script; build an admin onboarding flow when you go multi-club. |

None of these block a single-club launch. They are the natural next steps **if** you scale horizontally.

## AI cost controls

- Concierge (`/agent/chat`): **30 requests / 5 min per user**.
- Channel AI agents: **60 replies / 5 min per club**; over the cap, the AI reply is skipped (the member message still posts and staff can answer).
- Tune these in `artifacts/api-server/src/routes/agent.ts` and `lib/ai-throttle.ts`.

## Backups

- **Automated**: the `backup` service dumps the database **daily** to `./backups/`, keeping the **7 most recent** files. (The `backups/` directory is gitignored.)
- **Manual on-demand**:
  ```bash
  docker compose -f docker-compose.prod.yml exec db pg_dump -U fairway fairway360 > backup_$(date +%F).sql
  ```
- **Restore**:
  ```bash
  cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U fairway -d fairway360
  ```
- **Off-site**: periodically copy `./backups/` to object storage (S3/Backblaze) or `scp` it off the VPS — a local-only backup won't survive disk loss.

## Monitoring

- App logs: `docker compose -f docker-compose.prod.yml logs -f app` (structured JSON via pino).
- For alerting, point an uptime monitor (e.g. UptimeRobot/BetterStack) at `https://YOUR_DOMAIN/api/healthz` (returns `{"status":"ok"}`).
- Error tracking (Sentry, etc.) is not wired in — it would require adding a dependency; consider it post-launch.

## Security notes

- Sessions: cookie is `httpOnly`, `sameSite=lax`, and `Secure` in production (behind Caddy via `trust proxy`).
- Passwords: bcrypt-hashed. Reset tokens are single-use, SHA-256-hashed at rest, and expire in 1 hour.
- HSTS is set by Caddy. Login, password-reset, and the demo form are rate-limited.
- Rotate `SESSION_SECRET`/`DB_PASSWORD` by updating `.env` and `docker compose up -d` (rotating `SESSION_SECRET` logs everyone out).

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
# only if the DB schema changed:
docker compose -f docker-compose.prod.yml exec app pnpm --filter @workspace/db push
```
