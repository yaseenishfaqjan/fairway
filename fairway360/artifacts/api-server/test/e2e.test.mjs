// End-to-end API test suite — runs against a live server (default :5000) using
// Node's built-in test runner (no extra dependencies):
//   node --test artifacts/api-server/test/e2e.test.mjs
// Requires the prod server + Postgres running and seeded (Augusta Pines demo).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:5000/api";
const PW = "Password123!";
const stamp = Date.now();

async function login(email, password = PW) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: r.status, cookie: r.headers.get("set-cookie")?.split(";")[0] ?? null };
}
async function api(cookie, method, path, body) {
  const opt = { method, headers: { cookie } };
  if (body) {
    opt.headers["content-type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(`${BASE}${path}`, opt);
  let data = null;
  try { data = await r.json(); } catch { /* no body */ }
  return { status: r.status, data };
}
const lastResetToken = () => {
  try {
    const log = fs.readFileSync("/tmp/prod.log", "utf8");
    const m = [...log.matchAll(/reset\?token=([a-f0-9]{64})/g)];
    return m.length ? m[m.length - 1][1] : null;
  } catch { return null; }
};

test("auth: all three roles log in; bad password rejected", async () => {
  for (const e of ["carlos@augustapines.com", "maria@augustapines.com", "james@augustapines.com"]) {
    const { status } = await login(e);
    assert.equal(status, 200, `${e} should log in`);
  }
  const bad = await login("carlos@augustapines.com", "wrong");
  assert.equal(bad.status, 401);
});

test("member: dashboard, menu, events, channels read", async () => {
  const { cookie } = await login("james@augustapines.com");
  for (const p of ["/me/dashboard", "/menu", "/events", "/me/tee-times", "/me/orders", "/channels"]) {
    const { status } = await api(cookie, "GET", p);
    assert.equal(status, 200, `GET ${p}`);
  }
});

test("member: book tee time + place order persist", async () => {
  const { cookie } = await login("james@augustapines.com");
  const before = (await api(cookie, "GET", "/me/tee-times")).data.length;
  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const booked = await api(cookie, "POST", "/tee-times", { startsAt, players: 2, holes: 18 });
  assert.ok(booked.status >= 200 && booked.status < 300, "book tee time");
  const after = (await api(cookie, "GET", "/me/tee-times")).data.length;
  assert.equal(after, before + 1, "tee time persisted");

  const menu = (await api(cookie, "GET", "/menu")).data;
  const ord = await api(cookie, "POST", "/orders", { hole: 5, lines: [{ itemId: menu[0].id, qty: 1 }] });
  assert.ok(ord.status >= 200 && ord.status < 300, "place order");
});

test("employee: shifts, tasks, presence", async () => {
  const { cookie } = await login("maria@augustapines.com");
  for (const p of ["/me/shifts", "/me/tasks", "/me/time-off", "/team", "/me/handoff"]) {
    assert.equal((await api(cookie, "GET", p)).status, 200, `GET ${p}`);
  }
  assert.equal((await api(cookie, "PATCH", "/me/presence", { status: "available" })).status, 200);
});

test("supervisor: overview, leads, bookings, analytics, delegation", async () => {
  const { cookie } = await login("carlos@augustapines.com");
  for (const p of ["/overview", "/leads", "/bookings", "/escalations", "/staff", "/members", "/tasks", "/analytics/messaging"]) {
    assert.equal((await api(cookie, "GET", p)).status, 200, `GET ${p}`);
  }
  // delegation on/off
  assert.equal((await api(cookie, "POST", "/agents/delegate", { autonomy: "medium", durationMinutes: 30 })).status, 200);
  assert.equal((await api(cookie, "GET", "/agents/delegation")).data.active, true);
  await api(cookie, "POST", "/agents/delegation/end");
  assert.notEqual((await api(cookie, "GET", "/agents/delegation")).data.active, true);
});

test("supervisor: lead status update persists", async () => {
  const { cookie } = await login("carlos@augustapines.com");
  const leads = (await api(cookie, "GET", "/leads")).data;
  const lead = leads.find((l) => l.status !== "Won") ?? leads[0];
  const upd = await api(cookie, "PATCH", `/leads/${lead.id}`, { status: "Contacted" });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.status, "Contacted");
});

test("onboarding: create employee -> invite -> set password -> login", async () => {
  const { cookie } = await login("carlos@augustapines.com");
  const email = `qa.emp.${stamp}@augustapines.com`;
  const created = await api(cookie, "POST", "/staff", { name: "QA Hire", email, role: "employee", jobTitle: "Tester" });
  assert.equal(created.status, 201, "staff created");
  assert.ok(created.data.inviteLink.includes("/portal/reset?token="));
  const token = lastResetToken();
  assert.ok(token, "invite token logged");
  assert.equal((await api("", "POST", "/auth/reset-password", { token, password: "QApass123!" })).status, 200);
  assert.equal((await login(email, "QApass123!")).status, 200, "new hire can log in");
  // duplicate email rejected
  assert.equal((await api(cookie, "POST", "/staff", { name: "Dup", email, role: "employee", jobTitle: "x" })).status, 400);
});

test("onboarding: create member -> appears in roster", async () => {
  const { cookie } = await login("carlos@augustapines.com");
  const email = `qa.mem.${stamp}@augustapines.com`;
  const created = await api(cookie, "POST", "/members", { name: "QA Member", email, tier: "Premier" });
  assert.equal(created.status, 201, "member created");
  const roster = (await api(cookie, "GET", "/members")).data;
  assert.ok(roster.some((m) => m.email === email), "member in roster");
});

test("password reset: forgot is 200 + does not enumerate; bad token 400", async () => {
  assert.equal((await api("", "POST", "/auth/forgot-password", { email: "nobody@nowhere.test" })).status, 200);
  assert.equal((await api("", "POST", "/auth/reset-password", { token: "bad", password: "whatever123" })).status, 400);
});

test("messaging: member message posts (201)", async () => {
  const { cookie } = await login("james@augustapines.com");
  const channels = (await api(cookie, "GET", "/channels")).data;
  const general = channels.find((c) => c.key === "general") ?? channels[0];
  const sent = await api(cookie, "POST", `/channels/${general.id}/messages`, { content: `e2e ${stamp}` });
  assert.equal(sent.status, 201);
});

test("security: AI concierge is rate-limited per user", async () => {
  const { cookie } = await login("james@augustapines.com");
  let limited = 0;
  for (let i = 0; i < 35; i++) {
    const r = await api(cookie, "POST", "/agent/chat", { message: `ping ${i}` });
    if (r.status === 429) limited++;
  }
  assert.ok(limited > 0, "should hit the 30/5min cap");
});

test("tenant isolation: unauthenticated requests are rejected", async () => {
  for (const p of ["/overview", "/me/dashboard", "/members", "/leads"]) {
    const r = await fetch(`${BASE}${p}`);
    assert.equal(r.status, 401, `${p} requires auth`);
  }
});
