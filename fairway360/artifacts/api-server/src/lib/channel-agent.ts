// Per-department AI agents for the channel chat. When a member posts in a
// department channel, the matching agent replies. The Kitchen agent can also
// PLACE A REAL ORDER via a tool call (place_order) — it never invents an order.
// The system prompt is assembled from the 3-layer memory system (working /
// episodic / semantic) plus the club's per-agent config. Falls back to a
// deterministic, department-appropriate reply with no LLM key.

import { llmEnabled, llmComplete, llmCompleteWithTools, type LlmTool } from "./llm";
import { buildAgentSystemPrompt, type WorkingMemory, workingMemory } from "./memory";
import { placeAgentOrder, type OrderRequestItem } from "./agent-order";
import { bookAgentTeeTime } from "./agent-booking";
import type { AgentConfig } from "@workspace/db";

const DEPT_PROMPT: Record<string, string> = {
  kitchen:
    "You are the Kitchen & Dining AI assistant at a golf & country club. You take food and drink orders.\n" +
    "STRICT RULES:\n" +
    "1. Only ever discuss or offer items that appear in the CURRENT MENU below. Never invent items or prices.\n" +
    "2. Use the EXACT item the member asked for. NEVER substitute a different item (do not turn a Turkey Club into a Caesar Salad).\n" +
    "3. LOCATION: always deliver to the exact location the member states in this conversation (e.g. 'Table 5'). If they haven't said where, ASK them. You may suggest their usual table, but never silently use it — the member's stated location always wins.\n" +
    "4. To actually place an order you MUST call the place_order function. Do NOT say an order is placed unless you called it. Pass the exact items and the location the member gave.\n" +
    "5. Flow: confirm the exact item(s), quantity, and delivery location once; as soon as the member says yes/confirm, call place_order with those exact items and that location.\n" +
    "6. If the member has an allergy, never suggest items containing that allergen.\n" +
    "Warm and concise — 1-3 sentences.",
  pro_shop:
    "You are the Pro Shop AI assistant at a golf club. Help with equipment rentals, lessons with the Head Pro, and merchandise. Only reference real offerings; do not invent stock. Be golf-knowledgeable and concise.",
  reception:
    "You are the Reception AI assistant at a golf club. You can BOOK tee times.\n" +
    "STRICT RULES:\n" +
    "1. Only offer tee times listed in TEE AVAILABILITY — never invent slots or times.\n" +
    "2. To actually book, you MUST call the book_tee_time function. Never say a tee time is booked unless you called it.\n" +
    "3. Flow: confirm the date, time, and number of players once; as soon as the member says yes/confirm, call book_tee_time.\n" +
    "4. Also help with guest registration, club hours, dress code, and policies.\n" +
    "Organized and welcoming, concise.",
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

// The tool the Kitchen agent uses to create a real order.
const PLACE_ORDER_TOOL: LlmTool = {
  name: "place_order",
  description:
    "Create the member's food/drink order in the system. Call this ONLY after the member has clearly confirmed the exact item(s), quantity, and delivery location. Use exact menu item names — never substitute.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "The items the member confirmed, using exact menu names.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact menu item name" },
            quantity: { type: "integer", minimum: 1 },
          },
          required: ["name", "quantity"],
        },
      },
      location: {
        type: "string",
        description: "Where to deliver — e.g. 'Table 5' or 'Hole 3'. Use what the member said in this conversation.",
      },
    },
    required: ["items", "location"],
  },
};

function confirmationLine(
  first: string,
  r: Extract<Awaited<ReturnType<typeof placeAgentOrder>>, { ok: true }>,
): string {
  const items = r.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
  const loc = r.location ? ` to ${r.location}` : "";
  return `✅ Order confirmed, ${first}! ${items}${loc} — about ${r.etaMinutes} minutes. Order #${r.orderNumber}. The kitchen has it now.`;
}

// The tool the Reception agent uses to create a real tee-time booking.
const BOOK_TEE_TIME_TOOL: LlmTool = {
  name: "book_tee_time",
  description:
    "Book a tee time for the member. Call ONLY after the member has confirmed the date, time, and number of players.",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "Date as YYYY-MM-DD" },
      time: { type: "string", description: "Start time as 24-hour HH:MM, e.g. 09:00" },
      players: { type: "integer", minimum: 1, maximum: 8 },
    },
    required: ["date", "time", "players"],
  },
};

function bookingLine(
  first: string,
  r: Extract<Awaited<ReturnType<typeof bookAgentTeeTime>>, { ok: true }>,
): string {
  return `✅ Booked, ${first}! Tee time for ${r.players} ${r.players === 1 ? "player" : "players"} on ${r.whenLabel}. Confirmation #${r.reference}. See you on the first tee!`;
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
    .slice(-10)
    .map((h) => `${h.aiGenerated ? "Assistant" : h.senderName}: ${h.content}`)
    .join("\n");
  const agentName = channelAgentName(dept, opts.config);
  const userMsg = `Recent conversation:\n${convo || "(none)"}\n\n${opts.memberName} just said: "${opts.message}"\n\n${
    greeting ? `This is your first reply of the session — open with your greeting: "${greeting}"\n\n` : ""
  }Reply as ${agentName}.`;

  // Kitchen agent can place real orders via a tool call.
  if (dept === "kitchen" && opts.memberUserId) {
    const result = await llmCompleteWithTools({
      system,
      user: userMsg,
      tools: [PLACE_ORDER_TOOL],
      maxTokens: 350,
    });
    if (result?.kind === "tool" && result.name === "place_order") {
      const rawItems = Array.isArray(result.args.items) ? result.args.items : [];
      const items: OrderRequestItem[] = rawItems
        .map((i) => ({ name: String((i as { name?: unknown }).name ?? ""), quantity: Number((i as { quantity?: unknown }).quantity ?? 1) }))
        .filter((i) => i.name);
      const location = typeof result.args.location === "string" ? result.args.location : null;
      const placed = await placeAgentOrder({ clubId: opts.clubId, memberUserId: opts.memberUserId, items, location });
      if (placed.ok) {
        workingMemory.clear(opts.clubId, opts.memberUserId); // order done — reset the draft
        return confirmationLine(first, placed);
      }
      // Couldn't match items — ask the member to clarify (don't pretend it worked).
      return `Sorry ${first}, ${placed.reason} Could you tell me the exact item from our menu and I'll get it ordered right away?`;
    }
    if (result?.kind === "text") return result.text;
    return fallback;
  }

  // Reception agent can book real tee times via a tool call.
  if (dept === "reception" && opts.memberUserId) {
    const result = await llmCompleteWithTools({
      system,
      user: userMsg,
      tools: [BOOK_TEE_TIME_TOOL],
      maxTokens: 350,
    });
    if (result?.kind === "tool" && result.name === "book_tee_time") {
      const date = typeof result.args.date === "string" ? result.args.date : "";
      const time = typeof result.args.time === "string" ? result.args.time : "";
      const players = Number(result.args.players ?? 1);
      const booked = await bookAgentTeeTime({
        clubId: opts.clubId,
        memberUserId: opts.memberUserId,
        date,
        time,
        players,
      });
      if (booked.ok) return bookingLine(first, booked);
      return `Sorry ${first}, ${booked.reason} Would you like me to check other available times?`;
    }
    if (result?.kind === "text") return result.text;
    return fallback;
  }

  const text = await llmComplete({ system, user: userMsg, maxTokens: 350 });

  // Track lightweight session state (Layer 1) for the next turn.
  if (opts.memberUserId) {
    const patch: Partial<WorkingMemory> = { lastTopic: opts.message.slice(0, 200) };
    workingMemory.update(opts.clubId, opts.memberUserId, patch);
  }

  return text || fallback;
}
