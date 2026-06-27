---
name: Fairway360 cross-portal shared state
description: Why shared demo state between the member and staff portals must be localStorage-backed, not just React context.
---

# Sharing state across the Fairway360 portals

The Members Portal (`/portal/members`) and Staff Portal (`/portal/staff`) are **separate wouter routes**. Navigating between them (and the `/portal` login selector) is a full page navigation in the demo, which **remounts the React tree and resets in-memory context state**.

**Rule:** any demo state that must travel from one portal to the other (e.g. F&B orders placed by a member appearing on the staff board) must be persisted to `localStorage`, not held only in a React context/useState.

**Why:** an early version used a plain `OrdersProvider` context with in-memory `useState`. It passed single-page tests but failed e2e the moment the test navigated members→staff — the order vanished because the app reloaded. localStorage persistence fixed it.

**How to apply:** the shared store lives in `src/lib/orders-store.tsx` (`OrdersProvider` + `useOrders()`), persisted under key `fairway360.orders.v1`. For multi-tab correctness use collision-proof ids (`crypto.randomUUID`) and **merge** on the `storage` event (keep union of orders; on id conflict keep the more-advanced status) rather than blindly replacing the array — blind last-write-wins drops concurrent adds/status changes.
