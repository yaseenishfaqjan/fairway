# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Fairway360 — multi-tenant AI operating system for golf courses & country clubs. Three role-based portals (Member, Employee, Supervisor) on one codebase, with a WhatsApp-style messaging layer and per-department AI agents that cover when staff are offline.

**The canonical application is the pnpm monorepo in `fairway360/`.** The top-level `client/` and `server/` folders are earlier scaffolding kept for reference only — do not develop there. `mobile/` is a standalone Expo starter app (not in the pnpm workspace).

## Commands

All from `fairway360/` (pnpm workspaces):

```bash
pnpm install
pnpm run build                            # typecheck + build api-server + SPA
pnpm run typecheck                        # typecheck all workspaces
pnpm --filter @workspace/api-spec orval   # regenerate API client from OpenAPI spec
pnpm --filter @workspace/db push          # push Drizzle schema to PostgreSQL (no migration files)
pnpm --filter @workspace/scripts seed     # seed demo tenant "Augusta Pines" + users
pnpm --filter @workspace/scripts new-club # provision an additional club
pnpm --filter @workspace/api-server dev   # build + start API (dev, :3001; prod :5000)
pnpm --filter @workspace/fairway360 dev   # Vite dev server (:5173)
pnpm --filter @workspace/api-server test:e2e  # run e2e tests (node --test test/e2e.test.mjs)
```

Required env: `DATABASE_URL`, `SESSION_SECRET`, `PORT`. Optional (graceful fallbacks when absent): `ANTHROPIC_API_KEY` (+`CONCIERGE_MODEL`, default `claude-sonnet-4-6`), `OPENAI_API_KEY` (fallback LLM), `RESEND_API_KEY`+`EMAIL_FROM`, `TWILIO_*`, `STRIPE_*`. See `.env.example`.

Demo logins (password `Password123!`): `james@augustapines.com` (member), `maria@augustapines.com` (employee), `carlos@augustapines.com` (supervisor), `super@fairway360.io` (super_admin → `/portal/admin`).

## Architecture

### Contract-first API

`lib/api-spec/openapi.yaml` is the source of truth. Orval generates `lib/api-zod` (Zod schemas) and `lib/api-client-react` (typed TanStack Query hooks). When adding/changing endpoints: edit the OpenAPI spec → run orval → implement the Express route → use the generated hook in the SPA.

### Backend — `fairway360/artifacts/api-server`

Express 5, single service: in production the API serves the built SPA (`artifacts/fairway360/dist/public`) with SPA fallback, so the session cookie is same-origin (no CORS).

- `src/routes/` — auth, public, members, fnb, employees, supervisor, supervisor-crud (menu-admin/tee-sheet/knowledge/agents/invites/broadcast), onboarding (self-serve club wizard + tenant settings), admin (super-admin tenant management), channels, agent, realtime, push, notifications, stripe-webhook (mounted before body parser), health
- `src/middleware/auth.ts` — `requireAuth` (populates `req.auth` with `userId`/`clubId`/`role` from session), `requireRole(...)`, `requireStaff`
- `src/lib/` — services: `llm.ts` (provider-agnostic: Anthropic → OpenAI → deterministic fallback, pure REST no SDK), `concierge.ts` (member AI grounded in club data), `channel-agent.ts` (per-department agents), `escalation.ts` (keyword L1/L2/L3 detection — pauses AI + alerts supervisors on L2/L3), `presence.ts` (in-memory staff availability; agents stand down when staff available), `delegation.ts` (supervisor AI takeover with autonomy levels), `realtime.ts` (in-process SSE via EventEmitter — no external broker), `ai-throttle.ts` (concierge 30 req/5min/user, channel agents 60 replies/5min/club), `session.ts`, `notify.ts`, `stripe.ts`, `email.ts`, `sms.ts`

Auth is session-cookie (express-session + connect-pg-simple), NOT JWT. Realtime is SSE (`/api/realtime/*`), NOT websockets. There is no Redis — presence/delegation are in-memory and single-instance.

### Multi-tenancy (non-negotiable)

`clubs` is the tenant root; every business table carries `club_id`. **Every query must be scoped to `req.auth.clubId`, which comes from the session — never from client input.** User emails are unique per club, not globally.

### Database — `fairway360/lib/db`

Drizzle ORM + PostgreSQL. Schema in `src/schema/` (clubs, users, golf, fnb, messaging, workforce, crm, billing, audit, sessions). Schema changes are made in TypeScript then applied with `drizzle-kit push` — there are no migration files.

### Frontend — `fairway360/artifacts/fairway360`

React 19 + Vite 7 + TypeScript strict. Router: wouter (base from `import.meta.env.BASE_URL`). State: TanStack Query v5 (generated hooks), React Context (`lib/auth.tsx`, `lib/orders-store.tsx`). UI: Tailwind CSS v4 + shadcn/ui + Framer Motion. Mobile-first — 99.99% of usage is mobile.

- `src/pages/` — marketing pages (home, platform, solutions, pricing, …) + `portal/` (login, members, employees, supervisor, reset)
- `src/components/portal/` — portal-shell, channel-chat, course-map, service-board, member-order
- `RequireRole` gates portals; redirects to `/portal` when unauthenticated

### Deployment

Docker single-service: `docker-compose.prod.yml` runs postgres + app (:5000) + daily pg_dump backup + Caddy (auto-HTTPS, proxies to app:5000). See DEPLOY.md and OPERATIONS.md.
