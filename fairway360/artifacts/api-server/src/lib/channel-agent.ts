// Per-department AI agents for the channel chat. When a member posts in a
// department channel, the matching agent replies (food orders, pro-shop, tee
// times, general concierge). The system prompt is assembled from the 3-layer
// memory system (working / episodic / semantic — see memory.ts) plus the
// club's per-agent config (name, tone, greeting, custom prompt). Falls back
// to a deterministic, department-appropriate reply with no LLM key.

import { llmEnabled, llmComplete } from "./llm";
import { buildAgentSystemPrompt, type WorkingMemory, workingMemory } from "./memory";
import type { AgentConfig } from "@workspace/db";

const DEPT_PROMPT: Record<string, string> = {
  kitchen:
    "You are the Kitchen & Dining AI assistant at a golf & country club. Take food and drink orders, confirm item + quantity + delivery location before treating an order as placed, and give realistic timing (drinks 5-7 min, snacks 8-10 min, hot meals 15-20 min). Never recommend an item a member says they're allergic to. Warm, concise — 2-3 sentences.",
  pro_shop:
    "You are the Pro Shop AI assistant at a golf club. Help with equipment rentals, lessons with the Head Pro, and merchandise. Be golf-knowledgeable and concise.",
  reception:
    "You are the Reception AI assistant at a golf club. Help with tee-time bookings, guest registration, club hours, dress code, and general policies. Only offer tee times listed in TEE AVAILABILITY — never invent slots. Organized and welcoming, concise.",
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

/** Display name for a department agent — the club's configured name wins. */
export function channelAgentName(
  department: string | null | undefined,
  cfg?: AgentConfig | null,
): string {
  if (cfg?.name) return cfg.name;
  return AGENT_NAME[department ?? "general"] ?? "Club Assistant";
}

export async function channelAgentReply(opts: {
  clubId: string;
  department: string | null | undefined;
  memberName: string;
  memberUserId?: string;
  message: string;
  config?: AgentConfig | null;
  history: { senderName: string; content: string; aiGenerated: boolean }[];
}): Promise<string> {
  const dept = opts.department ?? "general";
  const first = opts.memberName.split(" ")[0] || "there";
  const fallback = (DEPT_FALLBACK[dept] ?? DEPT_FALLBACK["general"]!)(first);

  // First contact in a while + configured greeting → lead with it (works even
  // without an LLM key).
  const isFirstMessage = opts.history.filter((h) => h.aiGenerated).length === 0;
  const greeting = isFirstMessage && opts.config?.greetingMessage ? opts.config.greetingMessage : null;

  if (!llmEnabled()) return greeting ? `${greeting}\n\n${fallback}` : fallback;

  // All 3 memory layers injected here (menu, knowledge, tee sheet, member
  // preferences, working-session state).
  const system = await buildAgentSystemPrompt({
    clubId: opts.clubId,
    agentKey: dept,
    basePrompt: DEPT_PROMPT[dept] ?? DEPT_PROMPT["general"]!,
    memberUserId: opts.memberUserId,
  });

  const convo = opts.history
    .slice(-8)
    .map((h) => `${h.aiGenerated ? "Assistant" : h.senderName}: ${h.content}`)
    .join("\n");
  const agentName = channelAgentName(dept, opts.config);
  const userMsg = `Recent conversation:\n${convo || "(none)"}\n\n${opts.memberName} just said: "${opts.message}"\n\n${
    greeting ? `This is your first reply of the session — open with your greeting: "${greeting}"\n\n` : ""
  }Reply as ${agentName}.`;

  const text = await llmComplete({ system, user: userMsg, maxTokens: 350 });

  // Track lightweight session state (Layer 1) for the next turn.
  if (opts.memberUserId) {
    const patch: Partial<WorkingMemory> = { lastTopic: opts.message.slice(0, 200) };
    workingMemory.update(opts.clubId, opts.memberUserId, patch);
  }

  return text || fallback;
}
