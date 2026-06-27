// Per-department AI agents for the channel chat. When a member posts in a
// department channel, the matching agent replies (food orders, pro-shop, tee
// times, general concierge). Reuses Anthropic (same key as the concierge) and
// falls back to a deterministic, department-appropriate reply with no key, so
// the chat stays useful in the demo.

import { and, asc, eq } from "drizzle-orm";
import { db, menuItems } from "@workspace/db";
import { logger } from "./logger";

const MODEL = process.env["CONCIERGE_MODEL"] ?? "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const DEPT_PROMPT: Record<string, string> = {
  kitchen:
    "You are the Kitchen & Dining AI assistant at a golf & country club. Take food and drink orders, confirm item + quantity + delivery location before treating an order as placed, and give realistic timing (drinks 5-7 min, snacks 8-10 min, hot meals 15-20 min). Never recommend an item a member says they're allergic to. Warm, concise — 2-3 sentences.",
  pro_shop:
    "You are the Pro Shop AI assistant at a golf club. Help with equipment rentals, lessons with the Head Pro, and merchandise. Be golf-knowledgeable and concise.",
  reception:
    "You are the Reception AI assistant at a golf club. Help with tee-time bookings, guest registration, club hours, dress code, and general policies. Organized and welcoming, concise.",
  general:
    "You are the Fairway360 club concierge — first point of contact for members. Answer general questions and point members to the right place (Book for tee times, Order for food, Events, Account). Warm and concise.",
  management: "You are the club Supervisor AI coordinating staff. Be brief and operational.",
};

const DEPT_FALLBACK: Record<string, (first: string) => string> = {
  kitchen: (n) =>
    `Thanks ${n}! I've got your request — drinks are usually 5-7 min and hot dishes 15-20 min. The next available server will confirm and deliver to your location.`,
  pro_shop: (n) =>
    `Thanks ${n}! I've noted your pro-shop request — a team member will confirm availability and pricing shortly.`,
  reception: (n) =>
    `Thanks ${n}! Reception will follow up shortly. For tee times you can also use the Book tab for an instant slot.`,
  general: (n) =>
    `Hi ${n}! I can help with tee times, dining, events, and your account — and I'll route anything else to the right team.`,
  management: (n) => `Noted, ${n}.`,
};

const AGENT_NAME: Record<string, string> = {
  kitchen: "Kitchen Assistant",
  pro_shop: "Pro Shop Assistant",
  reception: "Reception Assistant",
  general: "Club Concierge",
  management: "Supervisor AI",
};

export function channelAgentName(department: string | null | undefined): string {
  return AGENT_NAME[department ?? "general"] ?? "Club Assistant";
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export async function channelAgentReply(opts: {
  clubId: string;
  department: string | null | undefined;
  memberName: string;
  message: string;
  history: { senderName: string; content: string; aiGenerated: boolean }[];
}): Promise<string> {
  const dept = opts.department ?? "general";
  const first = opts.memberName.split(" ")[0] || "there";
  const fallback = (DEPT_FALLBACK[dept] ?? DEPT_FALLBACK["general"]!)(first);

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return fallback;

  let menuText = "";
  if (dept === "kitchen") {
    try {
      const menu = await db
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.clubId, opts.clubId), eq(menuItems.available, true)))
        .orderBy(asc(menuItems.category));
      menuText =
        "\n\nMENU (name · $price · category):\n" +
        menu.map((m) => `- ${m.name} · $${Number(m.price).toFixed(2)} · ${m.category}`).join("\n");
    } catch {
      /* non-fatal */
    }
  }

  const system = (DEPT_PROMPT[dept] ?? DEPT_PROMPT["general"]!) + menuText;
  const convo = opts.history
    .slice(-8)
    .map((h) => `${h.aiGenerated ? "Assistant" : h.senderName}: ${h.content}`)
    .join("\n");
  const userMsg = `Recent conversation:\n${convo || "(none)"}\n\n${opts.memberName} just said: "${opts.message}"\n\nReply as the ${AGENT_NAME[dept]}.`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      logger.error({ status: res.status }, "channel-agent: anthropic error");
      return fallback;
    }
    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || fallback;
  } catch (err) {
    logger.error({ err }, "channel-agent: request failed");
    return fallback;
  }
}
