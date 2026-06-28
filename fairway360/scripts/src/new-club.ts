// Provision a brand-new club (tenant) on Fairway360.
//
// Creates the club, its first supervisor account, the default department
// channels, and a password-set invite link for the admin. Everything else
// (members, staff, menu, orders) the club fills in from the Supervisor portal.
//
// Usage (inside the app container):
//   pnpm --filter @workspace/scripts new-club \
//     --name "Premier Oaks Golf Club" \
//     --slug premier-oaks \
//     --plan enterprise \
//     --admin-name "Jane Doe" \
//     --admin-email jane@premieroaks.com \
//     [--timezone America/Chicago]
//
// Prints a "set your password" link for the admin; also emails it if Resend is
// configured. The admin logs in at the shared site and onboards their own team.

import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  clubs,
  users,
  staffProfiles,
  chatChannels,
  clubPlan,
} from "@workspace/db";

type Plan = (typeof clubPlan.enumValues)[number];

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const eq = key.indexOf("=");
    if (eq >= 0) {
      out[key.slice(0, eq)] = key.slice(eq + 1);
    } else {
      out[key] = argv[i + 1] ?? "";
      i++;
    }
  }
  return out;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fail(msg: string): never {
  console.error(`\n[new-club] ✗ ${msg}\n`);
  process.exit(1);
}

const DEFAULT_CHANNELS: Array<{
  key: string;
  name: string;
  emoji: string;
  department: string;
  order: number;
  member: boolean;
  desc: string;
}> = [
  { key: "general", name: "Concierge", emoji: "💬", department: "general", order: 0, member: true, desc: "General questions and member services" },
  { key: "pro_shop", name: "Pro Shop", emoji: "🏌️", department: "pro_shop", order: 1, member: true, desc: "Tee times, gear, and lessons" },
  { key: "kitchen", name: "F&B / Kitchen", emoji: "🍽️", department: "kitchen", order: 2, member: true, desc: "Food & beverage orders" },
  { key: "reception", name: "Reception", emoji: "📋", department: "reception", order: 3, member: true, desc: "Bookings, guests, hours, and policies" },
  { key: "management", name: "Management", emoji: "🛎️", department: "management", order: 4, member: false, desc: "Staff coordination (staff only)" },
];

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const name = args["name"]?.trim();
  const slug = args["slug"]?.trim().toLowerCase();
  const adminName = args["admin-name"]?.trim();
  const adminEmail = args["admin-email"]?.trim().toLowerCase();
  const timezone = args["timezone"]?.trim() || "America/New_York";
  const plan = (args["plan"]?.trim() || "enterprise") as Plan;

  if (!name) fail("--name is required (e.g. --name \"Premier Oaks Golf Club\")");
  if (!slug) fail("--slug is required (e.g. --slug premier-oaks)");
  if (!/^[a-z0-9-]+$/.test(slug)) fail("--slug may contain only lowercase letters, numbers, and hyphens");
  if (!adminName) fail("--admin-name is required");
  if (!adminEmail || !adminEmail.includes("@")) fail("--admin-email must be a valid email");
  if (!clubPlan.enumValues.includes(plan)) {
    fail(`--plan must be one of: ${clubPlan.enumValues.join(", ")}`);
  }

  // Guard against duplicates (slug is unique; email must be unused).
  const slugTaken = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug));
  if (slugTaken.length) fail(`a club with slug "${slug}" already exists`);
  const emailTaken = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail));
  if (emailTaken.length) fail(`a user with email "${adminEmail}" already exists`);

  console.log(`\n[new-club] Creating "${name}" (${plan})…`);

  const [club] = await db
    .insert(clubs)
    .values({ name, slug, businessType: "golf_course", timezone, plan, status: "active" })
    .returning({ id: clubs.id });
  const clubId = club.id;

  // First supervisor. Password is a random unusable hash until the admin sets
  // their own via the invite link (the reset flow overwrites passwordHash).
  const placeholder = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const [admin] = await db
    .insert(users)
    .values({
      clubId,
      email: adminEmail,
      passwordHash: placeholder,
      role: "supervisor",
      name: adminName,
      initials: initialsOf(adminName),
      status: "active",
    })
    .returning({ id: users.id });

  await db.insert(staffProfiles).values({
    clubId,
    userId: admin.id,
    jobTitle: "Club Administrator",
    employeeNo: "EMP-0001",
    defaultArea: "Clubhouse",
    currentStatus: "On Shift",
    hoursTarget: 40,
  });

  await db.insert(chatChannels).values(
    DEFAULT_CHANNELS.map((c) => ({
      clubId,
      key: c.key,
      name: c.name,
      description: c.desc,
      emoji: c.emoji,
      department: c.department,
      displayOrder: c.order,
      visibleToMembers: c.member,
    })),
  );

  // Invite: set a 7-day password-set token (same columns the reset flow uses).
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db
    .update(users)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .where(eq(users.id, admin.id));

  const base = process.env["APP_URL"] ?? "https://fairway360.io";
  const link = `${base}/portal/reset?token=${token}`;

  // Best-effort branded email via Resend (if configured).
  let emailed = false;
  const resendKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (resendKey && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: adminEmail,
          subject: `Welcome to Fairway360 — set up ${name}`,
          html: `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0f1f17">
            <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
              <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">Fairway360</div>
              <div style="font-size:20px;font-weight:600;margin-top:4px">${name} is ready</div>
            </div>
            <div style="border:1px solid #e3e8e5;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">
              <p>Hi ${adminName.split(" ")[0] || "there"},</p>
              <p>Your club's Fairway360 workspace has been created. Set your password to log in and start adding your team and members — this link expires in 7 days.</p>
              <p style="margin:24px 0"><a href="${link}" style="background:#1a6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Set your password</a></p>
            </div>
          </div>`,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.warn(`[new-club] email send returned ${res.status}`);
    } catch (err) {
      console.warn(`[new-club] email send failed: ${(err as Error).message}`);
    }
  }

  console.log(`
[new-club] ✓ Done.
  Club        : ${name}  (slug: ${slug}, plan: ${plan})
  Club ID     : ${clubId}
  Admin login : ${adminEmail}  (role: supervisor)
  Channels    : ${DEFAULT_CHANNELS.length} default department channels
  Invite email: ${emailed ? "sent ✓" : "not sent (configure RESEND_API_KEY/EMAIL_FROM) — share the link below"}

  >> Set-password link (valid 7 days):
     ${link}

  Next: the admin opens the link, sets a password, logs in at ${base}/portal,
  then invites employees and adds members from the Supervisor portal.
`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
