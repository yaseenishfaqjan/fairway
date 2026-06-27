# Fairway360 — Master Build Dump

A complete reference of everything built into the Fairway360 site, intended as a transfer/reference document for porting concepts to another project.

---

## 1. What this product is

A **premium marketing site + interactive demo** for **Fairway360**, an AI operating system for golf courses and country clubs (powered by Scalaro).

- **Frontend-only.** No backend, no database, no authentication. All form state and demo data live in local React state / `localStorage`.
- Two parts: (a) public marketing pages, (b) clickable, sample-data "portal" demos (staff + members).

---

## 2. Tech stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite, **wouter** routing, **framer-motion** animation, **shadcn/ui** components, **Tailwind CSS**
- **Forms/validation**: react-hook-form + Zod (`zod/v4`)
- The repo also contains an API server + Drizzle/Postgres scaffold, but **the Fairway360 site itself does not use them** — it is purely frontend.

Run commands:
- `pnpm --filter @workspace/fairway360 run dev` — run the site
- `pnpm --filter @workspace/fairway360 run typecheck` — verify the artifact (use typecheck, not build, from the shell)

---

## 3. Routes (wouter, base = artifact path prefix)

| Path | Page | File |
|------|------|------|
| `/` | Home | `src/pages/home.tsx` |
| `/solutions` | Solutions | `src/pages/solutions.tsx` |
| `/automations` | Automations | `src/pages/automations.tsx` |
| `/pricing` | Pricing | `src/pages/pricing.tsx` |
| `/demo` | Demo request form | `src/pages/demo.tsx` |
| `/portal` | Portal login selector | `src/pages/portal/login.tsx` |
| `/portal/staff` | Staff/Workers Portal | `src/pages/portal/staff.tsx` |
| `/portal/members` | Members Portal | `src/pages/portal/members.tsx` |
| (fallback) | Not Found | `src/pages/not-found.tsx` |

Routing notes:
- `wouter` `base` is set from `import.meta.env.BASE_URL` so the app works under its artifact path prefix.
- CTAs use shadcn `Button asChild` wrapping a wouter `Link` to avoid nested `<a><button>` markup (a11y).

---

## 4. Project structure

```
artifacts/fairway360/src/
├── App.tsx                       # route table; wraps app in OrdersProvider
├── index.css                     # theme tokens (palette, fonts, utilities)
├── pages/
│   ├── home.tsx
│   ├── solutions.tsx
│   ├── automations.tsx
│   ├── pricing.tsx
│   ├── demo.tsx
│   ├── not-found.tsx
│   └── portal/
│       ├── login.tsx             # /portal selector
│       ├── staff.tsx             # /portal/staff (dark app)
│       └── members.tsx           # /portal/members (dark app)
├── components/
│   ├── brand-logo.tsx            # inline SVG emblem + wordmark
│   ├── layout/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── portal/
│   │   ├── course-map.tsx        # live SVG course map
│   │   ├── service-board.tsx     # staff F&B order board (dark)
│   │   ├── member-order.tsx      # member on-course food ordering
│   │   └── portal-logo.tsx       # dark-tone wrapper over BrandLogo
│   └── ui/                       # shadcn/ui components
└── lib/
    ├── portal-data.ts            # all sample portal data + types
    ├── orders-store.tsx          # shared F&B orders context (localStorage)
    └── utils.ts
```

---

## 5. Marketing pages (content)

- **Home** (`home.tsx`): hero, problems, solutions overview, interactive workflow demo, mock dashboard, AI script examples, pricing teaser, ROI, final CTA.
- **Solutions** (`solutions.tsx`): 14 detailed solution cards — each with description, benefits, and club-type tags. Data-driven from a static in-file array.
- **Automations** (`automations.tsx`): 14 expandable automation cards, each with trigger / action / outcome + a step-by-step flow. Uses an accordion (framer-motion `AnimatePresence`) with ARIA disclosure attributes.
- **Pricing** (`pricing.tsx`): 3-tier pricing cards.
- **Demo** (`demo.tsx`): validated request form (react-hook-form + Zod). Submissions held in **local React state only** — no backend.

---

## 6. The Portals (clickable demos — frontend only, sample data, NO auth/DB)

Entry points: navbar "Log In" + footer "Portals" column → `/portal` login selector → Staff or Members portal.

### Staff / Workers Portal (`/portal/staff`)
A self-contained dark, mobile-first app. Sections (state-driven, not routes):
- **Overview** (default): KPI status badges — Groups Out, New Leads, Open Requests, F&B Active.
- **Course Map**: live SVG course map with member markers + dispatch / radio controls + "All Groups On Course" list.
- **F&B Service**: the order board (see below) — this is the staff hero action (gold-highlighted tile).
- **Leads**, **Bookings**: dark custom HTML tables.
- **Requests**, **Tasks**: glass cards / checklist.

### Members Portal (`/portal/members`)
A self-contained dark, mobile-first app. Sections:
- **Home**: greeting + status badges, stat cards, quick actions, upcoming events, club announcements.
- **Book Tee Time**.
- **Order Food** (Dining): prominent on-course food ordering (gold-highlighted — headline action).
- **Events RSVP**.
- **Account / Billing**.
- **Concierge**: AI concierge mock chat.

---

## 7. The F&B ordering loop (the standout interactive feature)

This is the most sophisticated piece — a **closed loop between two separately-routed portals**, with no backend.

- **Shared store** (`lib/orders-store.tsx`): an `OrdersProvider` React context + `useOrders()` hook. A single shared F&B order list persisted to **`localStorage`** (key `fairway360.orders.v1`) with **cross-tab `storage`-event sync**. This is why an order placed in the Members Portal survives navigation and shows up in the Staff Portal. The provider wraps the whole app in `App.tsx`.

- **Member side** (`member-order.tsx`, Members "Dining" tab): the member (sample user James Whitmore, Hole 3 · Cart 12) browses a photo menu by category, builds a cart with qty steppers + a live order summary, taps "Send Order" → pushes a `New` order into the shared store.

- **Staff side** (`service-board.tsx`, Staff "F&B Service" tab): one order is routed to **two role views at once** via a role switcher (`role` state: `all` | `kitchen` | `cart`, `BOARDS` map) over the single shared list:
  - **All Orders** (manager): 3 columns Incoming → Preparing → Ready.
  - **Kitchen** (upstairs prep): New Orders → In the Kitchen, marks Ready.
  - **Cart Service** (cart attendants): read-only "Coming Up" + actionable "Ready to Deliver", marks Delivered.
  - Each ticket shows the member's hole + cart so cart service delivers by request instead of riding around.
  - Status flow: `New → Preparing → Ready → Delivered` (`STATUS_META`, `NEXT_STATUS`).
  - Staff can also create orders themselves via a "New Order" dialog (group select → menu grid by category with qty steppers → ticket + total + note).

- **Data/types** in `portal-data.ts`: `menuItems` (each with a generated food photo), `ServiceOrder` type, `initialOrders` seed.

**The closed loop:** golfer orders (member portal) → kitchen preps (staff) → cart delivers to their hole (staff). All without a server.

---

## 8. Brand / logo system

- `components/brand-logo.tsx` — the brand logo is a **custom inline SVG emblem** (golf flag in a gold-ringed emerald badge, `useId()` for a unique gradient id) + a letterspaced "Fairway360" wordmark.
- Props: `size` (sm/md/lg — lg stacks vertically) + `tone` (light → forest wordmark for ivory backgrounds; dark → white wordmark for portals).
- Used by `navbar.tsx`, `footer.tsx` (light) and `portal-logo.tsx` (dark wrapper).
- Replaced an older baked PNG logo — it's all inline SVG now, so it scales and re-tones cleanly.

---

## 9. Design system — "The Members' Standard"

A heritage country-club editorial concept: warm/premium, deliberately **not** generic SaaS.

**Typography**
- **Fraunces** serif for all headlines (loaded in `index.css`; a base-layer rule makes `h1–h4` serif via `--app-font-serif`).
- **Inter** for body / UI.
- `.font-display` utility applies the serif to non-heading elements (e.g. `CardTitle`, which is a `<div>` and is NOT caught by the h-tag rule).

**Eyebrows**
- Small uppercase letterspaced labels above section headings via the `.eyebrow` utility.
- On dark forest sections use `text-accent`; on light ivory sections use a darker brass `text-[hsl(38_55%_40%)]` for contrast.

**Light palette (tokens in `index.css`)**
- background warm ivory `40 33% 96%`
- foreground `155 30% 11%`
- primary deep forest `155 52% 15%`
- accent antique brass `40 58% 50%`
- card `42 45% 99%`
- border `40 20% 86%`
- radius `0.5rem`

**Dark sections (marketing)**
- deep forest `bg-[hsl(155_45%_8%)]` (or `155 44% 8%` for the dashboard panel) with `bg-white/[0.04]` cards and `border-white/10`.

### Portals — "Futuristic Clubhouse" (dark)
Both portals are self-contained dark, mobile-first apps sharing one design language (no shared light shell). Luxury golf-tech SaaS feel (Tesla × private club).
- **Base**: `bg-[#04130c]` with a fixed ambient backdrop (emerald radial glow + soft gold/emerald blur orbs at `-z-10`). White text throughout.
- **Glass panels**: a local `Glass` component — `rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl` + deep shadow; wraps a framer-motion `motion.div` with a shared `fade()` `whileInView` fade-up (staggered via an `i` index prop). Each portal defines its own copy of these primitives.
- **Gold accents** use the `accent` token (brass). Active nav/buttons: `bg-accent text-accent-foreground`; active icon-nav tiles get a gold glow `shadow-[0_0_28px_-8px_hsl(43_65%_55%/0.7)]`. The headline action tile ("Order Food" for members, "F&B Service" for staff) is always gold-highlighted.
- **Navigation**: a persistent icon-tile nav (top) + a `fixed` bottom mobile nav (`pb-[env(safe-area-inset-bottom)]`); `main` has `pb-28` to clear it. Sections are **state-driven** (`section` state, not routes) and re-animate on switch via a `key={section}` motion wrapper.
- Because the page is dark, shadcn `Button variant="outline"` is overridden with explicit `border-white/20 bg-white/5 text-white` (default outline assumes a light bg). Checkboxes get `border-white/30 data-[state=checked]:bg-accent` overrides.

---

## 10. Gotchas / conventions worth carrying over

- The shadcn `Progress` component was extended with an `indicatorClassName` prop — pass that (not raw props) to color the indicator bar.
- CTAs use `<Button asChild><Link>…</Link></Button>` everywhere (a11y — avoid nested `<a><button>`).
- Data-driven pages (Solutions, Automations) read from static in-file arrays — easy to edit content without touching layout.
- On dark UI, chips/pills follow `bg-{color}-500/15 text-{color}-300`; gold = `accent`; emerald = `emerald-400/300`.
- Portal sections are switched by component state with a `key={section}` motion wrapper so each switch re-animates.
- The shared orders store is `localStorage`-backed with cross-tab sync — a clean pattern for faking real-time multi-view state with no backend.

---

## 11. Asset handling

- Generated food photos for the menu live under `attached_assets/generated_images/menu_*.png` and are imported via the `@assets` Vite alias (e.g. `import img from "@assets/..."`).
- Note: the `attached_assets/` directory is **not** served by the web server — assets must be imported (Vite `@assets` alias), not referenced by raw URL path.
