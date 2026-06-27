# Fairway360

AI-powered operating system for golf courses and country clubs — a full-stack SaaS app covering tee sheets, bookings, members, point-of-sale, inventory, tournaments, staff, maintenance, reporting, and club settings.

## Tech stack

**Frontend** — React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS · React Router 6 · TanStack Query 5 · Zustand · React Hook Form + Zod · Recharts · Framer Motion · Lucide icons

**Backend** — Node 20 · Express 4 · Drizzle ORM · PostgreSQL (production) / embedded PGlite (zero-config local dev) · JWT auth (short-lived access token + httpOnly refresh cookie) · Zod validation

**Infra** — npm workspaces monorepo · Docker multi-stage builds · nginx (static SPA + API reverse proxy)

## Repository layout

```
fairway360-project/
├── client/            # React SPA (Vite)
│   ├── src/
│   ├── nginx.conf     # prod: serves SPA, proxies /api → server
│   └── Dockerfile
├── server/            # Express + Drizzle API
│   ├── src/
│   ├── drizzle/       # generated SQL migrations
│   ├── docker-entrypoint.sh
│   └── Dockerfile
├── docker-compose.yml # postgres + server + client
├── .env.example
└── package.json       # workspace root
```

## Local development

Prerequisites: **Node 20+** and **npm 10+**. No database installation is required — the server uses an embedded PGlite database by default.

```bash
npm install            # installs both workspaces
npm run db:migrate     # create tables in the local PGlite database
npm run db:seed        # populate demo data
npm run dev            # starts API (:3001) and client (:5173) together
```

Open http://localhost:5173.

### Default login

| Role        | Email                      | Password       |
| ----------- | -------------------------- | -------------- |
| Club Owner  | `admin@pinevalley.com`     | `Password123!` |
| Manager     | `manager@pinevalley.com`   | `Password123!` |

## Production deployment (Docker)

The Compose stack runs three services: PostgreSQL, the API server, and an nginx container that serves the built SPA and reverse-proxies `/api` to the server (same-origin, so the auth cookie works without CORS).

```bash
cp .env.example .env    # then edit the secrets below
docker compose up --build
```

Open http://localhost:8080.

On first boot the server container automatically applies migrations and seeds demo data (the seed is idempotent and skips if the database is already populated).

### Environment variables

Set these in `.env` for production (Compose reads them; sensible dev defaults are baked in):

| Variable                 | Purpose                                        | Default                  |
| ------------------------ | ---------------------------------------------- | ------------------------ |
| `DB_PASSWORD`            | PostgreSQL password                            | `fairway_dev_password`   |
| `JWT_SECRET`             | Signs access tokens (use a 64-char random str) | dev placeholder          |
| `JWT_REFRESH_SECRET`     | Signs refresh tokens (different random str)    | dev placeholder          |
| `ACCESS_TOKEN_TTL`       | Access token lifetime                          | `15m`                    |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime (days)                  | `7`                      |
| `CLIENT_URL`             | Public web origin                              | `http://localhost:8080`  |
| `WEB_PORT`               | Host port for the web UI                       | `8080`                   |
| `SEED_DATABASE`          | Seed demo data on server start                 | `true`                   |

> **Before exposing this publicly**, replace `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `DB_PASSWORD` with strong random values, set `SEED_DATABASE=false`, and terminate TLS in front of nginx.

## Scripts (workspace root)

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Run server + client together (hot reload)     |
| `npm run build`       | Build server then client for production        |
| `npm run db:generate` | Generate a new SQL migration from the schema  |
| `npm run db:migrate`  | Apply migrations                              |
| `npm run db:seed`     | Seed demo data (idempotent)                    |
| `npm run db:reset`    | Drop and recreate the local database          |

## API

The REST API is served under `/api/v1`. Health check: `GET /api/v1/health`.

Auth uses a 15-minute JWT access token (in memory on the client) plus a 7-day httpOnly refresh cookie; the client transparently refreshes on `401`. All data is scoped to the authenticated user's club, and write endpoints are gated by role (`superadmin` > `club_owner` > `manager` > `staff` > `ranger`).
