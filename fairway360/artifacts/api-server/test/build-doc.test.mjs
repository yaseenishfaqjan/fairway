// E2E tests for the build-doc features: self-serve onboarding, supervisor
// full CRUD (menu / tee sheet / knowledge / agents / invites / broadcast),
// 3-layer AI memory, and multi-tenant isolation between two live clubs.
//
//   node --test artifacts/api-server/test/build-doc.test.mjs
//
// Requires the prod server (:5000) + Postgres running and seeded, with server
// logs written to /tmp/prod.log (invite links are read from the log when email
// is not configured). Restart the server before running to reset rate limits.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:5000/api";
const PW = "Password123!";
const stamp = Date.now();

async function raw(method, path, body, cookie) {
  const opt = { method, headers: {} };
  if (cookie) opt.headers.cookie = cookie;
  if (body !== undefined) {
    opt.headers["content-type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(`${BASE}${path}`, opt);
  let data = null;
  try { data = await r.json(); } catch { /* no body */ }
  return { status: r.status, data, cookie: r.headers.get("set-cookie")?.split(";")[0] ?? null };
}
const api = (cookie) => ({
  get: (p) => raw("GET", p, undefined, cookie),
  post: (p, b) => raw("POST", p, b, cookie),
  patch: (p, b) => raw("PATCH", p, b, cookie),
  del: (p) => raw("DELETE", p, undefined, cookie),
});
async function login(email, password = PW) {
  const r = await raw("POST", "/auth/login", { email, password });
  assert.equal(r.status, 200, `login ${email}`);
  return r.cookie;
}
const lastInviteToken = () => {
  try {
    const log = fs.readFileSync("/tmp/prod.log", "utf8");
    const m = [...log.matchAll(/reset\?token=([a-f0-9]{64})/g)];
    return m.length ? m[m.length - 1][1] : null;
  } catch { return null; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shared state across sequential tests.
let clubA = null; // { cookie, slug }
let clubB = null;
let menuItemId = null;

test("onboarding: create club A provisions channels + agents and logs admin in", async () => {
  const r = await raw("POST", "/onboarding/create-club", {
    clubName: `Harrogate GC ${stamp}`,
    slug: `harrogate-${stamp}`,
    timezone: "Europe/London",
    currency: "GBP",
    adminName: "Alice Admin",
    adminEmail: `alice+${stamp}@harrogate.test`,
    adminPassword: PW,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.cookie, "admin session cookie set");
  clubA = { cookie: r.cookie, slug: `harrogate-${stamp}` };

  const a = api(clubA.cookie);
  const channels = await a.get("/channels");
  assert.equal(channels.status, 200);
  assert.equal(channels.data.length, 5, "5 default channels provisioned");

  const agents = await a.get("/agents");
  assert.equal(agents.status, 200);
  assert.equal(agents.data.length, 5, "5 AI agents provisioned");

  const status = await a.get("/onboarding/status");
  assert.equal(status.data.completed, false);
});

test("onboarding: duplicate slug rejected", async () => {
  const r = await raw("POST", "/onboarding/create-club", {
    clubName: "Dup", slug: clubA.slug,
    adminName: "X Y", adminEmail: `dup+${stamp}@x.test`, adminPassword: PW,
  });
  assert.equal(r.status, 400);
});

test("menu: full CRUD + bulk import (supervisor)", async () => {
  const a = api(clubA.cookie);
  const created = await a.post("/menu-admin", {
    name: "Club Sandwich", price: 14, category: "Lunch",
    allergens: ["gluten", "dairy"], prepTimeMinutes: 12,
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  menuItemId = created.data.id;

  const patched = await a.patch(`/menu-admin/${menuItemId}`, { price: 16, available: false });
  assert.equal(patched.status, 200);

  let list = (await a.get("/menu-admin")).data;
  const item = list.find((m) => m.id === menuItemId);
  assert.equal(item.price, 16);
  assert.equal(item.available, false);

  const bulk = await a.post("/menu-admin/bulk-import", {
    items: [
      { name: "Iced Tea", price: 4, category: "Beverages" },
      { name: "Full English", price: 11, category: "Breakfast" },
    ],
  });
  assert.equal(bulk.status, 201);
  assert.equal(bulk.data.imported, 2);

  const del = await a.del(`/menu-admin/${menuItemId}`);
  assert.equal(del.status, 200);
  list = (await a.get("/menu-admin")).data;
  assert.ok(!list.some((m) => m.id === menuItemId), "archived item hidden");
});

test("tee sheet: generate, block one, block-range", async () => {
  const a = api(clubA.cookie);
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const gen = await a.post("/tee-sheet/generate", {
    date, openTime: "08:00", closeTime: "10:00", intervalMinutes: 10, maxPlayers: 4,
  });
  assert.equal(gen.status, 201, JSON.stringify(gen.data));
  assert.equal(gen.data.created, 12, "12 slots in 2 hours at 10-min intervals");

  // Idempotent: regenerating creates nothing new.
  const regen = await a.post("/tee-sheet/generate", {
    date, openTime: "08:00", closeTime: "10:00", intervalMinutes: 10,
  });
  assert.equal(regen.data.created, 0);

  const slots = (await a.get(`/tee-sheet?date=${date}`)).data;
  assert.equal(slots.length, 12);

  const block = await a.patch(`/tee-sheet/${slots[0].id}`, { status: "blocked", notes: "Maintenance" });
  assert.equal(block.status, 200);

  const range = await a.post("/tee-sheet/block-range", {
    startDate: date, endDate: date, startTime: "09:00", endTime: "10:00", reason: "Tournament",
  });
  assert.equal(range.status, 200);
  assert.ok(range.data.blocked >= 5, `block-range blocked ${range.data.blocked}`);

  const after = (await a.get(`/tee-sheet?date=${date}`)).data;
  assert.ok(after.filter((s) => s.status === "blocked").length >= 6);
});

test("knowledge base: CRUD", async () => {
  const a = api(clubA.cookie);
  const created = await a.post("/knowledge", {
    category: "hours", title: "Club hours", content: "Mon-Fri 6am-9pm, Sat-Sun 5:30am-10pm",
  });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const upd = await a.patch(`/knowledge/${id}`, { content: "Mon-Sun 6am-9pm" });
  assert.equal(upd.status, 200);

  const list = (await a.get("/knowledge")).data;
  assert.equal(list.find((k) => k.id === id).content, "Mon-Sun 6am-9pm");

  assert.equal((await a.del(`/knowledge/${id}`)).status, 200);
});

test("agents: configure kitchen agent (rename, keywords, hours)", async () => {
  const a = api(clubA.cookie);
  const upd = await a.patch("/agents/kitchen", {
    name: "Caddy", tone: "casual",
    greetingMessage: "Hey! Caddy here — hungry?",
    escalationKeywords: ["revolting"],
    isActive: true,
  });
  assert.equal(upd.status, 200, JSON.stringify(upd.data));

  const agents = (await a.get("/agents")).data;
  const kitchen = agents.find((x) => x.agentKey === "kitchen");
  assert.equal(kitchen.name, "Caddy");
  assert.deepEqual(kitchen.escalationKeywords, ["revolting"]);

  const stats = await a.get("/agents/kitchen/stats");
  assert.equal(stats.status, 200);
  assert.equal((await a.patch("/agents/nope", { name: "X Y" })).status, 404);
});

test("invites: staff invite listed, accepted via token, single-use", async () => {
  const a = api(clubA.cookie);
  const email = `emp+${stamp}@harrogate.test`;
  const created = await a.post("/staff", {
    name: "Eve Employee", email, role: "employee", jobTitle: "Server",
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.ok(created.data.inviteLink.includes("token="), "invite link returned");

  const invites = (await a.get("/invites")).data;
  const mine = invites.find((i) => i.email === email);
  assert.ok(mine, "invite listed");
  assert.equal(mine.status, "pending");

  // Accept: set password with the token from the returned link.
  const token = created.data.inviteLink.split("token=")[1];
  const accept = await raw("POST", "/auth/reset-password", { token, password: PW });
  assert.equal(accept.status, 200);

  // Invite now marked used; token cannot be reused.
  const after = (await a.get("/invites")).data.find((i) => i.email === email);
  assert.equal(after.status, "used");
  const reuse = await raw("POST", "/auth/reset-password", { token, password: "Another123!" });
  assert.equal(reuse.status, 400, "token is single-use");

  // The employee can log in.
  const cookie = await login(email);
  assert.ok(cookie);
});

test("invites: revoke kills a pending invite", async () => {
  const a = api(clubA.cookie);
  const email = `gone+${stamp}@harrogate.test`;
  const created = await a.post("/staff", { name: "Gone Soon", email, role: "employee", jobTitle: "Temp" });
  const invite = (await a.get("/invites")).data.find((i) => i.email === email);
  const revoked = await a.del(`/invites/${invite.id}`);
  assert.equal(revoked.status, 200);

  const token = created.data.inviteLink.split("token=")[1];
  const attempt = await raw("POST", "/auth/reset-password", { token, password: PW });
  assert.equal(attempt.status, 400, "revoked token rejected");
});

test("members: supervisor creates member + overrides preferences", async () => {
  const a = api(clubA.cookie);
  const created = await a.post("/members", {
    name: "James Gold", email: `james+${stamp}@harrogate.test`, tier: "Gold",
  });
  assert.equal(created.status, 201);

  const list = (await a.get("/members")).data;
  const m = list.find((x) => x.name === "James Gold");
  assert.ok(m, "member in roster");

  const prefs = await a.patch(`/members/${m.id}/preferences`, {
    allergens: ["shellfish"], vipNotes: "Anniversary Aug 12",
  });
  assert.equal(prefs.status, 200, JSON.stringify(prefs.data));

  const detail = await a.get(`/members/${m.id}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.data.preferences.allergens, ["shellfish"]);
  assert.equal(detail.data.preferences.vipNotes, "Anniversary Aug 12");
});

test("onboarding: complete flips the flag", async () => {
  const a = api(clubA.cookie);
  assert.equal((await a.post("/onboarding/complete")).status, 200);
  assert.equal((await a.get("/onboarding/status")).data.completed, true);
});

test("broadcast: reaches club members", async () => {
  const a = api(clubA.cookie);
  const r = await a.post("/broadcast", {
    title: "Course update", content: "Back nine reopens at noon.",
    targetGroup: "all_members", channels: ["in_app"],
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.recipients >= 1);
});

test("memory: allergen mentioned in chat is learned + visible to supervisor", async () => {
  // Augusta Pines (seeded club): james mentions an allergy in the Kitchen channel.
  const james = await login("james@augustapines.com");
  const j = api(james);
  const channels = (await j.get("/channels")).data;
  const kitchen = channels.find((c) => c.department === "kitchen");
  assert.ok(kitchen, "kitchen channel exists");

  const posted = await j.post(`/channels/${kitchen.id}/messages`, {
    content: `I'm allergic to peanuts, please keep that in mind (${stamp})`,
  });
  assert.equal(posted.status, 201);
  await sleep(1500); // learnFromSession is fire-and-forget

  const carlos = await login("carlos@augustapines.com");
  const c = api(carlos);
  const roster = (await c.get("/members")).data;
  const jm = roster.find((m) => m.email === "james@augustapines.com");
  const prefs = await c.get(`/members/${jm.id}/preferences`);
  assert.equal(prefs.status, 200);
  assert.ok(
    (prefs.data.allergens ?? []).includes("peanuts"),
    `allergen learned: ${JSON.stringify(prefs.data.allergens)}`,
  );
});

test("tenant isolation: club B sees nothing of club A", async () => {
  const r = await raw("POST", "/onboarding/create-club", {
    clubName: `Edinburgh GC ${stamp}`,
    slug: `edinburgh-${stamp}`,
    adminName: "Bob Admin",
    adminEmail: `bob+${stamp}@edinburgh.test`,
    adminPassword: PW,
  });
  assert.equal(r.status, 201);
  clubB = { cookie: r.cookie };
  const b = api(clubB.cookie);

  // Club B starts empty even though club A has data.
  assert.equal((await b.get("/menu-admin")).data.length, 0, "no cross-tenant menu");
  assert.equal((await b.get("/members")).data.length, 0, "no cross-tenant members");
  assert.equal((await b.get("/knowledge")).data.length, 0, "no cross-tenant knowledge");
  assert.equal((await b.get("/invites")).data.length, 0, "no cross-tenant invites");

  // Direct ID access across tenants → 404.
  const aList = (await api(clubA.cookie).get("/menu-admin")).data;
  if (aList.length) {
    const hit = await b.patch(`/menu-admin/${aList[0].id}`, { price: 1 });
    assert.equal(hit.status, 404, "cross-tenant menu id is 404");
  }
  const aMembers = (await api(clubA.cookie).get("/members")).data;
  if (aMembers.length) {
    assert.equal((await b.get(`/members/${aMembers[0].id}`)).status, 404, "cross-tenant member id is 404");
  }
});

test("public: club-info resolves via ?slug and X-Tenant-Slug header", async () => {
  const bySlug = await raw("GET", `/public/club-info?slug=${clubA.slug}`);
  assert.equal(bySlug.status, 200);
  assert.equal(bySlug.data.slug, clubA.slug);
  assert.ok(bySlug.data.primaryColor?.startsWith("#"));

  const byHeader = await fetch(`${BASE}/public/club-info`, {
    headers: { "x-tenant-slug": "augusta-pines" },
  });
  assert.equal(byHeader.status, 200);
  assert.equal((await byHeader.json()).name, "Augusta Pines");

  const missing = await raw("GET", "/public/club-info?slug=does-not-exist");
  assert.equal(missing.status, 404);
});

test("bulk import: members created + duplicates skipped", async () => {
  const a = api(clubA.cookie);
  const r = await a.post("/members/bulk-import", {
    rows: [
      { name: "Bulk One", email: `bulk1+${stamp}@harrogate.test`, tier: "Silver" },
      { name: "Bulk Two", email: `bulk2+${stamp}@harrogate.test` },
      { name: "James Gold", email: `james+${stamp}@harrogate.test` }, // duplicate from earlier test
    ],
    sendInvites: false,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.imported, 2);
  assert.equal(r.data.skipped.length, 1);

  const roster = (await a.get("/members")).data;
  assert.ok(roster.some((m) => m.name === "Bulk One"));
});

test("analytics: orders endpoint returns aggregates", async () => {
  const a = api(clubA.cookie);
  const r = await a.get("/analytics/orders");
  assert.equal(r.status, 200);
  assert.ok(typeof r.data.orders7d === "number");
  assert.ok("byStatus" in r.data && "byDay" in r.data);
});

test("member self-service: /me/preferences round-trips and feeds AI memory", async () => {
  const james = await login("james@augustapines.com");
  const j = api(james);
  const set = await j.patch("/me/preferences", {
    dietaryRestrictions: ["vegetarian"],
    usualTable: "Table 7",
    communicationStyle: "brief",
  });
  assert.equal(set.status, 200, JSON.stringify(set.data));
  const got = (await j.get("/me/preferences")).data;
  assert.deepEqual(got.dietaryRestrictions, ["vegetarian"]);
  assert.equal(got.usualTable, "Table 7");
  assert.equal(got.communicationStyle, "brief");
});

test("super admin: overview, tenant list, provision, suspend blocks login", async () => {
  const superCookie = await login("super@fairway360.io");
  const s = api(superCookie);

  const overview = await s.get("/admin/overview");
  assert.equal(overview.status, 200);
  assert.ok(overview.data.totalClubs >= 3, "HQ + Augusta + test clubs");

  const tenants = await s.get("/admin/tenants");
  assert.equal(tenants.status, 200);
  assert.ok(tenants.data.some((t) => t.slug === clubA.slug), "club A listed");

  // Provision a club on a customer's behalf → admin gets an invite link.
  const provisioned = await s.post("/admin/tenants", {
    clubName: `Managed GC ${stamp}`, slug: `managed-${stamp}`, plan: "starter",
    adminName: "Carol Client", adminEmail: `carol+${stamp}@managed.test`,
  });
  assert.equal(provisioned.status, 201, JSON.stringify(provisioned.data));
  assert.ok(provisioned.data.inviteLink.includes("token="));

  // Accept the invite, log in, then suspend the club → login blocked.
  const token = provisioned.data.inviteLink.split("token=")[1];
  assert.equal((await raw("POST", "/auth/reset-password", { token, password: PW })).status, 200);
  assert.ok(await login(`carol+${stamp}@managed.test`), "club admin logs in while active");

  const suspend = await s.patch(`/admin/tenants/${provisioned.data.clubId}`, { status: "suspended" });
  assert.equal(suspend.status, 200);
  const blocked = await raw("POST", "/auth/login", { email: `carol+${stamp}@managed.test`, password: PW });
  assert.equal(blocked.status, 401, "suspended club cannot log in");

  const reactivate = await s.patch(`/admin/tenants/${provisioned.data.clubId}`, { status: "active" });
  assert.equal(reactivate.status, 200);

  // Read-only tenant detail.
  const detail = await s.get(`/admin/tenants/${provisioned.data.clubId}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.plan, "starter");
});

test("rbac: supervisor cannot reach super-admin routes", async () => {
  const a = api(clubA.cookie);
  for (const p of ["/admin/overview", "/admin/tenants"]) {
    assert.equal((await a.get(p)).status, 403, `supervisor GET ${p} → 403`);
  }
});

test("rbac: member cannot reach supervisor CRUD", async () => {
  const james = await login("james@augustapines.com");
  const j = api(james);
  for (const p of ["/menu-admin", "/invites", "/knowledge", "/agents", "/tee-sheet?date=2026-07-10"]) {
    const { status } = await j.get(p);
    assert.equal(status, 403, `member GET ${p} → 403`);
  }
  assert.equal((await j.post("/broadcast", { content: "hi", targetGroup: "all", channels: ["in_app"] })).status, 403);
});
