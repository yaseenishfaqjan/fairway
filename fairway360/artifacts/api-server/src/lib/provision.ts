// Tenant provisioning — creates a club with everything it needs in one
// transaction: the club row, the admin (supervisor) account, the five default
// department channels, and a default config row for each AI agent.
// Used by the self-serve onboarding wizard (and mirrors scripts/new-club.ts).

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  agentConfigs,
  chatChannels,
  clubs,
  staffProfiles,
  users,
} from "@workspace/db";
import { badRequest } from "./http";
import { initialsOf } from "./invite";

export const DEFAULT_CHANNELS = [
  { key: "general", name: "Concierge", emoji: "💬", department: "general", order: 0, member: true, desc: "General questions and member services" },
  { key: "pro_shop", name: "Pro Shop", emoji: "🏌️", department: "pro_shop", order: 1, member: true, desc: "Tee times, gear, and lessons" },
  { key: "kitchen", name: "F&B / Kitchen", emoji: "🍽️", department: "kitchen", order: 2, member: true, desc: "Food & beverage orders" },
  { key: "reception", name: "Reception", emoji: "📋", department: "reception", order: 3, member: true, desc: "Bookings, guests, hours, and policies" },
  { key: "management", name: "Management", emoji: "🛎️", department: "management", order: 4, member: false, desc: "Staff coordination (staff only)" },
] as const;

export const DEFAULT_AGENTS = [
  { key: "kitchen", name: "Kitchen Assistant" },
  { key: "pro_shop", name: "Pro Shop Assistant" },
  { key: "reception", name: "Reception Assistant" },
  { key: "general", name: "Club Concierge" },
  { key: "management", name: "Supervisor AI" },
] as const;

export type ProvisionInput = {
  clubName: string;
  slug: string;
  timezone?: string;
  currency?: string;
  countryCode?: string;
  primaryColor?: string;
  accentColor?: string;
  phone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export async function provisionClub(input: ProvisionInput): Promise<{
  clubId: string;
  adminUserId: string;
}> {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    throw badRequest("Slug may contain only lowercase letters, numbers, and hyphens (3-60 chars).");
  }
  const email = input.adminEmail.toLowerCase().trim();
  if (input.adminPassword.length < 8) {
    throw badRequest("Password must be at least 8 characters.");
  }

  const [slugTaken] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug));
  if (slugTaken) throw badRequest("That club URL is already taken — choose another slug.");

  return db.transaction(async (tx) => {
    const [club] = await tx
      .insert(clubs)
      .values({
        name: input.clubName.trim(),
        slug,
        businessType: "golf_course",
        timezone: input.timezone ?? "America/New_York",
        currency: input.currency ?? "USD",
        countryCode: input.countryCode ?? "US",
        primaryColor: input.primaryColor ?? "#1B3A2D",
        accentColor: input.accentColor ?? "#C9A84C",
        phone: input.phone ?? null,
        address: input.address ?? null,
        plan: "trial",
        status: "active",
        onboardingStep: "2",
      })
      .returning({ id: clubs.id });

    const [admin] = await tx
      .insert(users)
      .values({
        clubId: club.id,
        email,
        passwordHash: bcrypt.hashSync(input.adminPassword, 10),
        role: "supervisor",
        name: input.adminName.trim(),
        initials: initialsOf(input.adminName),
        phone: input.phone ?? null,
        status: "active",
      })
      .returning({ id: users.id });

    await tx.insert(staffProfiles).values({
      clubId: club.id,
      userId: admin.id,
      jobTitle: "Club Administrator",
      employeeNo: "EMP-0001",
      defaultArea: "Clubhouse",
      currentStatus: "On Shift",
    });

    await tx.insert(chatChannels).values(
      DEFAULT_CHANNELS.map((c) => ({
        clubId: club.id,
        key: c.key,
        name: c.name,
        description: c.desc,
        emoji: c.emoji,
        department: c.department,
        displayOrder: c.order,
        visibleToMembers: c.member,
      })),
    );

    await tx.insert(agentConfigs).values(
      DEFAULT_AGENTS.map((a) => ({
        clubId: club.id,
        agentKey: a.key,
        name: a.name,
        tone: "friendly",
        isActive: true,
      })),
    );

    return { clubId: club.id, adminUserId: admin.id };
  });
}
