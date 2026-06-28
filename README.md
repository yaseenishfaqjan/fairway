# Fairway360

**Multi-tenant, AI-powered operating system for golf courses & country clubs.**

Fairway360 gives a club three role-based portals on one codebase — **Members** book tee times, order food on the course, RSVP to events, pay balances, and chat with an AI concierge; **Employees** clock in, manage F&B service and tasks, and coordinate on department channels; **Supervisors** run leads/CRM, the tee sheet, dispatch, escalations, staff messaging, and live operations analytics. A WhatsApp-style messaging layer with per-department AI agents handles member requests 24/7 and hands off cleanly to staff.

> The canonical application is the pnpm monorepo in [`fairway360/`](./fairway360). The top-level `client/` and `server/` folders are earlier scaffolding kept for reference.

---

## Highlights

- **Three portals, one app** — Member, Employee, Supervisor, each on an animated mobile-first shell (99.99% of usage is mobile).
- **Real multi-tenant isolation** — every query is scoped to the authenticated club; `club_id` always comes from the session, never from client input.
- **Messaging & AI-agent layer**
  - Department channels (General / Kitchen / Pro Shop / Reception members-visible, Management staff-only) with live SSE updates.
  - Per-department **AI agents** that auto-reply when no staff is available.
  - **Escalation** detection (L1/L2/L3) → AI holds the conversation and alerts a supervisor to resolve.
  - **Presence** states gate the agents (humans first; AI covers when staff are away).
  - **Supervisor delegation** — hand the shift to the Supervisor AI at Low/Medium/High/Full autonomy.
  - **Agent handoff** summary + **messaging analytics** on the supervisor dashboard.
- **Env-gated integrations** — Anthropic (concierge + agents), Resend (email), Twilio (SMS), Stripe (payments). Everything runs with graceful fallbacks when keys are absent, so the app works out of the box.

---

## Tech stack

**Frontend** — React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS v4 · wouter · TanStack Query v5 · Framer Motion · shadcn/ui · Lucide icons

**Backend** — Node 24 · Express 5 · Drizzle ORM · PostgreSQL · session-cookie auth · Zod validation · in-process SSE (EventEmitter) for realtime

**Contract & codegen** — OpenAPI (`lib/api-spec/openapi.yaml`) → Orval generates `@workspace/api-zod` (Zod schemas) and `@workspace/api-client-react` (typed TanStack Query hooks)

**Tooling** — pnpm workspaces monorepo · Docker dev container

---

## Monorepo layout (`fairway360/`)

```
fairway360/
├── artifacts/
│   ├── api-server/        # Express 5 + Drizzle API
│   │   └── src/
│   │       ├── routes/    # auth, members, fnb, employees, supervisor, channels, agent, realtime
│   │       ├── lib/       # anthropic, stripe, sms, email, realtime, presence, delegation, escalation, channel-agent
│   │       └── middleware/
│   └── fairway360/        # React SPA (Vite)
│       └── src/
│           ├── pages/portal/   # members, employees, supervisor
│           ├── components/portal/
│           └── lib/
├── lib/
│   ├── api-spec/          # OpenAPI source + Orval config
│   ├── api-zod/           # generated Zod schemas
│   ├── api-client-react/  # generated TanStack Query hooks
│   └── db/                # Drizzle schema (multi-tenant)
├── pnpm-workspace.yaml
└── package.json
```

---

## Environment variables

Always required:

| Variable         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string             |
| `SESSION_SECRET` | Signs the session cookie                 |
| `PORT`           | Server port (e.g. `5000` in production)  |

Optional — set these to switch integrations from fallback to live:

| Variable | Enables |
| -------- | ------- |
| `ANTHROPIC_API_KEY` (opt. `CONCIERGE_MODEL`, default `claude-sonnet-4-6`) | AI concierge + channel agents |
| `RESEND_API_KEY` + `EMAIL_FROM` (opt. `SALES_NOTIFY_EMAIL`) | Transactional / sales email |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM` | SMS notifications |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Member payments |

Secrets live in the environment only — never commit real values. See [`.env.example`](./.env.example).

---

## Build & run

The app builds to a **single service**: in `NODE_ENV=production` the Express server serves the built SPA (`artifacts/fairway360/dist/public`) with SPA fallback, so the auth cookie is same-origin (no CORS).

From `fairway360/`:

```bash
pnpm install

# generate the API client from the OpenAPI spec
pnpm --filter @workspace/api-spec orval

# build shared libs, then api-server + frontend
pnpm -r build

# push the Drizzle schema to your database
pnpm --filter @workspace/db push

# run (production single-service)
DATABASE_URL=... SESSION_SECRET=... PORT=5000 NODE_ENV=production node artifacts/api-server/dist/index.mjs
```

Open http://localhost:5000.

---

## Demo logins

All use password `Password123!` (tenant: **Augusta Pines**):

| Role       | Email                      |
| ---------- | -------------------------- |
| Member     | `james@augustapines.com`   |
| Employee   | `maria@augustapines.com`   |
| Supervisor | `carlos@augustapines.com`  |

---

## Notes

- **Mobile-first**: shipped images are downscaled + JPEG-encoded and below-the-fold media is lazy-loaded.
- **Realtime** uses native `EventSource` against in-process SSE topics (`/api/realtime/channels`, `/api/realtime/orders`) — no external broker.
- **Accessibility**: app-wide reduced-motion support (`prefers-reduced-motion`) and visible focus rings.
