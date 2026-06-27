// Escalation detection. Scans a member message for trigger phrases and returns
// a level (0 = none, 1 = flag, 2 = notify + pause, 3 = urgent) plus a trigger
// type. Runs before the AI agent replies so the agent can pause on L2/L3.

export type EscalationResult = {
  level: 0 | 1 | 2 | 3;
  triggerType: string | null;
  keywords: string[];
};

// Level 3 — urgent (safety, legal, membership, VIP rage)
const L3: { type: string; words: string[] }[] = [
  { type: "membership_cancellation", words: ["cancel my membership", "cancel membership", "quit the club", "end my membership"] },
  { type: "safety_concern", words: ["sick", "ill", "injury", "injured", "hurt", "accident", "unsafe", "food poisoning"] },
  { type: "legal_language", words: ["lawsuit", "lawyer", "legal action", "sue you", "negligence", "i'll sue"] },
  { type: "social_media_threat", words: ["social media", "newspaper", "post about this", "review you online", "health department"] },
  { type: "vip_complaint", words: ["absolutely furious", "disgusting", "dangerous"] },
];

// Level 2 — notify and pause (money, allergy, frustration, asked for human)
const L2: { type: string; words: string[] }[] = [
  { type: "refund_request", words: ["refund", "compensation", "money back", "credit my account", "discount"] },
  { type: "allergy_concern", words: ["allergic", "allergy", "allergen", "reaction", "anaphyla"] },
  { type: "asked_for_human", words: ["speak to someone", "speak to a human", "talk to a person", "real person", "manager"] },
  { type: "frustration", words: ["unacceptable", "ridiculous", "poor service", "this is wrong", "very unhappy", "fed up"] },
];

// Level 1 — flag and continue
const L1: { type: string; words: string[] }[] = [
  { type: "delay", words: ["still waiting", "where is", "how much longer", "taking too long", "waited", "been a while"] },
  { type: "mild_dissatisfaction", words: ["disappointed", "not happy", "expected better"] },
];

// Word-boundary match so short keywords like "ill" / "hurt" / "sue" don't fire
// inside unrelated words ("will", "shurt", "issue").
function matches(t: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(t);
}

function scan(
  t: string,
  groups: { type: string; words: string[] }[],
): { type: string; keywords: string[] } | null {
  for (const g of groups) {
    const hits = g.words.filter((w) => matches(t, w));
    if (hits.length) return { type: g.type, keywords: hits };
  }
  return null;
}

export function detectEscalation(text: string): EscalationResult {
  const t = text.toLowerCase();
  const l3 = scan(t, L3);
  if (l3) return { level: 3, triggerType: l3.type, keywords: l3.keywords };
  const l2 = scan(t, L2);
  if (l2) return { level: 2, triggerType: l2.type, keywords: l2.keywords };
  const l1 = scan(t, L1);
  if (l1) return { level: 1, triggerType: l1.type, keywords: l1.keywords };
  return { level: 0, triggerType: null, keywords: [] };
}

/** The agent's holding message when it pauses for a human (L2/L3). */
export function holdingMessage(level: 2 | 3, firstName: string): string {
  if (level === 3) {
    return `I'm connecting you with our Club Manager right now, ${firstName}. Please hold for just a moment — someone will be with you shortly.`;
  }
  return `I want to make sure this is handled perfectly for you, ${firstName}. I've flagged it for our team and a staff member will be with you shortly. Thank you for your patience.`;
}
