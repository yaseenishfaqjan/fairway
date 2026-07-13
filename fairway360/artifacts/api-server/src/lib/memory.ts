// 3-layer AI memory system.
//
//   Layer 1 — Working memory: in-process, per (club, member), 2-hour TTL.
//             Holds the current session's context (order draft, pending
//             confirmations) so the agent never re-asks within a session.
//             Single-instance by design, like presence/delegation.
//   Layer 2 — Episodic memory: member_preferences in PostgreSQL, permanent.
//             What the agents have learned about a member across sessions.
//   Layer 3 — Semantic memory: per-club shared knowledge in PostgreSQL —
//             menu, knowledge base, today's tee availability, agent configs.
//             Loaded fresh on every agent call so supervisor edits apply
//             immediately (no restart).

import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import {
  db,
  agentConfigs,
  clubs,
  knowledgeBase,
  memberPreferences,
  members,
  menuItems,
  teeTimes,
  users,
  type AgentConfig,
  type MemberPreferences,
} from "@workspace/db";
import { notifyMany } from "./notify";
import { logger } from "./logger";

// ── Layer 1: working memory ────────────────────────────────────────────────

export type WorkingMemory = {
  currentOrderDraft?: { items: { name: string; qty: number }[]; location?: string };
  pendingConfirmation?: { type: string; details: Record<string, unknown> };
  lastTopic?: string;
  notes?: string[];
  touchedAt: number;
};

const WM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const wm = new Map<string, WorkingMemory>();

const wmKey = (clubId: string, memberUserId: string) => `${clubId}:${memberUserId}`;

export const workingMemory = {
  get(clubId: string, memberUserId: string): WorkingMemory | null {
    const entry = wm.get(wmKey(clubId, memberUserId));
    if (!entry) return null;
    if (Date.now() - entry.touchedAt > WM_TTL_MS) {
      wm.delete(wmKey(clubId, memberUserId));
      return null;
    }
    return entry;
  },
  update(clubId: string, memberUserId: string, patch: Partial<WorkingMemory>): void {
    const current = workingMemory.get(clubId, memberUserId) ?? { touchedAt: Date.now() };
    wm.set(wmKey(clubId, memberUserId), { ...current, ...patch, touchedAt: Date.now() });
  },
  clear(clubId: string, memberUserId: string): void {
    wm.delete(wmKey(clubId, memberUserId));
  },
};

// Periodic sweep so abandoned sessions don't accumulate.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of wm) if (now - v.touchedAt > WM_TTL_MS) wm.delete(k);
}, 10 * 60 * 1000).unref();

// ── Layer 2: episodic memory ────────────────────────────────────────────────

export type Episodic = MemberPreferences & {
  memberName: string;
  membershipTier: string;
  memberId: string;
};

/** Load a member's episodic memory (by their auth user id). Null if not a member. */
export async function getEpisodicMemory(
  clubId: string,
  memberUserId: string,
): Promise<Episodic | null> {
  const [row] = await db
    .select({ m: members, u: users, p: memberPreferences })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(memberPreferences, eq(memberPreferences.memberId, members.id))
    .where(and(eq(members.clubId, clubId), eq(members.userId, memberUserId)));
  if (!row) return null;
  const base: MemberPreferences =
    row.p ??
    ({
      id: "",
      clubId,
      memberId: row.m.id,
      allergens: [],
      dietaryRestrictions: [],
      favoriteItems: [],
      usualTable: null,
      averageOrderValue: null,
      communicationStyle: null,
      usualTeeTime: null,
      usualPlayers: null,
      prefersCart: null,
      complaintCount: 0,
      lastComplaintSummary: null,
      complimentCount: 0,
      vipNotes: null,
      totalSessions: 0,
      lastSessionSummary: null,
      lastSeenAt: null,
      updatedBySession: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MemberPreferences);
  return { ...base, memberName: row.u.name, membershipTier: row.m.tier, memberId: row.m.id };
}

// ── Layer 3: semantic memory ────────────────────────────────────────────────

export type SemanticMemory = {
  clubName: string;
  timezone: string;
  currency: string;
  menu: { name: string; price: string; category: string; description: string | null; allergens: string[]; prepTimeMinutes: number }[];
  hours: string | null;
  dressCode: string | null;
  policies: { title: string; content: string }[];
  faqs: { title: string; content: string }[];
  facilities: string | null;
  upcomingEvents: { title: string; content: string }[];
  teeAvailabilityToday: { time: string; open: number }[];
  agentConfigs: AgentConfig[];
};

export async function loadSemanticMemory(clubId: string): Promise<SemanticMemory> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [[club], menu, knowledge, openSlots, configs] = await Promise.all([
    db.select().from(clubs).where(eq(clubs.id, clubId)),
    db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.clubId, clubId),
          eq(menuItems.available, true),
          eq(menuItems.archived, false),
        ),
      )
      .orderBy(asc(menuItems.category), asc(menuItems.sortOrder)),
    db
      .select()
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.clubId, clubId), eq(knowledgeBase.isActive, true)))
      .orderBy(asc(knowledgeBase.category)),
    db
      .select()
      .from(teeTimes)
      .where(
        and(
          eq(teeTimes.clubId, clubId),
          isNull(teeTimes.memberId),
          eq(teeTimes.status, "pending"),
          gte(teeTimes.startsAt, dayStart),
          lt(teeTimes.startsAt, dayEnd),
        ),
      )
      .orderBy(asc(teeTimes.startsAt)),
    db.select().from(agentConfigs).where(eq(agentConfigs.clubId, clubId)),
  ]);

  const byCat = (cat: string) => knowledge.filter((k) => k.category === cat);
  return {
    clubName: club?.name ?? "the club",
    timezone: club?.timezone ?? "America/New_York",
    currency: club?.currency ?? "USD",
    menu: menu.map((m) => ({
      name: m.name,
      price: m.price,
      category: m.category,
      description: m.description,
      allergens: (m.allergens as string[]) ?? [],
      prepTimeMinutes: m.prepTimeMinutes,
    })),
    hours: byCat("hours")[0]?.content ?? null,
    dressCode: byCat("dress_code")[0]?.content ?? null,
    policies: byCat("policies").map((k) => ({ title: k.title, content: k.content })),
    faqs: byCat("faq").map((k) => ({ title: k.title, content: k.content })),
    facilities: byCat("facilities")[0]?.content ?? null,
    upcomingEvents: byCat("events").map((k) => ({ title: k.title, content: k.content })),
    teeAvailabilityToday: openSlots.map((s) => ({
      time: s.startsAt.toISOString(),
      open: s.maxPlayers - s.players,
    })),
    agentConfigs: configs,
  };
}

/** The club's config for one agent, or null when unconfigured (defaults apply). */
export async function getAgentConfig(
  clubId: string,
  agentKey: string,
): Promise<AgentConfig | null> {
  const [cfg] = await db
    .select()
    .from(agentConfigs)
    .where(and(eq(agentConfigs.clubId, clubId), eq(agentConfigs.agentKey, agentKey)));
  return cfg ?? null;
}

/** Whether an agent is inside its configured working hours (null hours = always). */
export function withinWorkingHours(cfg: AgentConfig | null, now = new Date()): boolean {
  if (!cfg?.workingHoursStart || !cfg.workingHoursEnd) return true;
  const [sh, sm] = cfg.workingHoursStart.split(":").map(Number);
  const [eh, em] = cfg.workingHoursEnd.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = (sh ?? 0) * 60 + (sm ?? 0);
  const end = (eh ?? 0) * 60 + (em ?? 0);
  // Overnight window (e.g. 23:00–07:00) wraps midnight.
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

// ── Prompt assembly: inject all 3 layers ────────────────────────────────────

export async function buildAgentSystemPrompt(opts: {
  clubId: string;
  agentKey: string;
  basePrompt: string;
  memberUserId?: string;
}): Promise<string> {
  const [semantic, episodic, cfg] = await Promise.all([
    loadSemanticMemory(opts.clubId),
    opts.memberUserId
      ? getEpisodicMemory(opts.clubId, opts.memberUserId)
      : Promise.resolve(null),
    getAgentConfig(opts.clubId, opts.agentKey),
  ]);

  let prompt = opts.basePrompt;
  if (cfg?.customSystemPrompt) prompt += `\n\n${cfg.customSystemPrompt}`;
  if (cfg?.tone) prompt += `\nTone: ${cfg.tone}.`;

  prompt += `\n\nCLUB: ${semantic.clubName}`;
  prompt += `\nTIMEZONE: ${semantic.timezone} · CURRENCY: ${semantic.currency}`;
  prompt += `\nCURRENT TIME: ${new Date().toLocaleString("en-US", { timeZone: semantic.timezone })}`;

  // Layer 2 — member episodic memory
  if (episodic) {
    prompt += `\n\nMEMBER MEMORY:`;
    prompt += `\n- Name: ${episodic.memberName} (tier: ${episodic.membershipTier})`;
    const allergens = episodic.allergens as string[];
    if (allergens?.length) {
      prompt += `\n- ALLERGENS (CRITICAL — NEVER suggest items containing these): ${allergens.join(", ")}`;
    }
    const dietary = episodic.dietaryRestrictions as string[];
    if (dietary?.length) prompt += `\n- Dietary restrictions: ${dietary.join(", ")}`;
    const favs = episodic.favoriteItems as { name: string; orderedCount: number }[];
    if (favs?.length) {
      prompt += `\n- Favourite items: ${favs
        .slice(0, 5)
        .map((f) => `${f.name} (${f.orderedCount}x)`)
        .join(", ")} — offer their usual first`;
    }
    if (episodic.usualTable)
      prompt += `\n- Usual table (fallback ONLY if the member doesn't state a location this conversation): ${episodic.usualTable}`;
    if (episodic.communicationStyle)
      prompt += `\n- Communication style: ${episodic.communicationStyle}`;
    if (episodic.vipNotes) prompt += `\n- VIP NOTES (supervisor-added): ${episodic.vipNotes}`;
    if (episodic.lastSessionSummary)
      prompt += `\n- Last conversation: ${episodic.lastSessionSummary}`;
  }

  // Layer 3 — semantic memory
  if (opts.agentKey === "kitchen" && semantic.menu.length) {
    const memberAllergens = new Set(((episodic?.allergens as string[]) ?? []).map((a) => a.toLowerCase()));
    prompt +=
      `\n\nCURRENT MENU (name · $price · category · prep min):\n` +
      semantic.menu
        .map((m) => {
          const conflict = m.allergens.some((a) => memberAllergens.has(a.toLowerCase()));
          return `- ${m.name} · $${Number(m.price).toFixed(2)} · ${m.category} · ${m.prepTimeMinutes}min${
            m.allergens.length ? ` · contains: ${m.allergens.join("/")}` : ""
          }${conflict ? "  ⚠ DO NOT OFFER (member allergen)" : ""}`;
        })
        .join("\n");
  }
  if (opts.agentKey === "reception" && semantic.teeAvailabilityToday.length) {
    prompt +=
      `\n\nTEE AVAILABILITY TODAY:\n` +
      semantic.teeAvailabilityToday
        .slice(0, 20)
        .map((s) => `- ${new Date(s.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: semantic.timezone })} (${s.open} spots)`)
        .join("\n");
  }
  if (semantic.hours) prompt += `\n\nCLUB HOURS: ${semantic.hours}`;
  if (semantic.dressCode) prompt += `\nDRESS CODE: ${semantic.dressCode}`;
  if (semantic.policies.length)
    prompt += `\nPOLICIES:\n${semantic.policies.map((p) => `- ${p.title}: ${p.content}`).join("\n")}`;
  if (semantic.faqs.length)
    prompt += `\nFAQ:\n${semantic.faqs.map((f) => `- ${f.title}: ${f.content}`).join("\n")}`;
  if (semantic.upcomingEvents.length)
    prompt += `\nUPCOMING EVENTS: ${semantic.upcomingEvents.map((e) => e.title).join(", ")}`;

  // Layer 1 — working memory (current session)
  if (opts.memberUserId) {
    const working = workingMemory.get(opts.clubId, opts.memberUserId);
    if (working?.currentOrderDraft) {
      prompt += `\n\nACTIVE ORDER DRAFT: ${JSON.stringify(working.currentOrderDraft)}\nDo not re-ask for information already in the draft.`;
    }
    if (working?.pendingConfirmation) {
      prompt += `\nAWAITING CONFIRMATION: ${JSON.stringify(working.pendingConfirmation)}`;
    }
  }

  return prompt;
}

// ── Learning: update episodic memory after a session ────────────────────────

const KNOWN_ALLERGENS = [
  "nuts",
  "peanut",
  "peanuts",
  "tree nuts",
  "shellfish",
  "dairy",
  "milk",
  "gluten",
  "wheat",
  "eggs",
  "egg",
  "soy",
  "fish",
  "sesame",
];

/** Extract allergens a member mentions ("I'm allergic to nuts"). */
export function detectAllergens(text: string): string[] {
  const t = text.toLowerCase();
  if (!/allerg/i.test(t)) return [];
  return KNOWN_ALLERGENS.filter((a) => new RegExp(`\\b${a}\\b`).test(t)).map((a) =>
    a === "peanut" || a === "peanuts" ? "peanuts" : a === "egg" ? "eggs" : a === "milk" ? "dairy" : a,
  );
}

type Fav = { name: string; orderedCount: number; lastOrdered: string };

function mergeFavorites(current: Fav[], ordered: string[]): Fav[] {
  const map = new Map(current.map((f) => [f.name.toLowerCase(), { ...f }]));
  const today = new Date().toISOString().slice(0, 10);
  for (const name of ordered) {
    const key = name.toLowerCase();
    const hit = map.get(key);
    if (hit) {
      hit.orderedCount += 1;
      hit.lastOrdered = today;
    } else {
      map.set(key, { name, orderedCount: 1, lastOrdered: today });
    }
  }
  return [...map.values()].sort((a, b) => b.orderedCount - a.orderedCount).slice(0, 20);
}

export async function learnFromSession(opts: {
  clubId: string;
  memberUserId: string;
  sessionId?: string;
  memberMessage: string;
  itemsOrdered?: string[];
  deliveryLocation?: string;
  summary?: string;
}): Promise<void> {
  try {
    const [m] = await db
      .select({ id: members.id, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(members.clubId, opts.clubId), eq(members.userId, opts.memberUserId)));
    if (!m) return;

    const [existing] = await db
      .select()
      .from(memberPreferences)
      .where(eq(memberPreferences.memberId, m.id));

    const newAllergens = detectAllergens(opts.memberMessage);
    const currentAllergens = ((existing?.allergens as string[]) ?? []).map((a) => a.toLowerCase());
    const discovered = newAllergens.filter((a) => !currentAllergens.includes(a));
    // SAFETY: allergens are append-only from sessions.
    const allergens = [...new Set([...currentAllergens, ...newAllergens])];

    const favorites = mergeFavorites(
      ((existing?.favoriteItems as Fav[]) ?? []),
      opts.itemsOrdered ?? [],
    );

    const values = {
      clubId: opts.clubId,
      memberId: m.id,
      allergens,
      favoriteItems: favorites,
      usualTable: opts.deliveryLocation ?? existing?.usualTable ?? null,
      totalSessions: (existing?.totalSessions ?? 0) + 1,
      lastSessionSummary: opts.summary ?? existing?.lastSessionSummary ?? null,
      lastSeenAt: new Date(),
      updatedBySession: opts.sessionId ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(memberPreferences).set(values).where(eq(memberPreferences.id, existing.id));
    } else {
      await db.insert(memberPreferences).values(values);
    }

    // New allergen discovered mid-conversation → tell the supervisors.
    if (discovered.length) {
      const sups = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.clubId, opts.clubId), eq(users.role, "supervisor")));
      await notifyMany(
        opts.clubId,
        sups.map((s) => s.id),
        {
          type: "allergen",
          title: "New allergen detected",
          body: `${m.name} mentioned an allergy: ${discovered.join(", ")}. Saved to their profile.`,
          link: "/portal/supervisor",
        },
      );
    }
  } catch (err) {
    logger.error({ err }, "memory: learnFromSession failed");
  }
}
