// Provider-agnostic LLM helper. Tries each configured provider in order and
// falls through to the next when one errors, so a bad/expired key or a provider
// outage degrades gracefully instead of taking the AI offline. Pure REST (no SDK).
//
// Provider order:
//   - Default: OpenAI first (if OPENAI_API_KEY set), then Anthropic.
//   - Override with LLM_PROVIDER=anthropic to prefer Anthropic.
// If every provider fails/absent, returns null and callers use a deterministic
// fallback reply, so the app keeps working with no keys at all.

import { logger } from "./logger";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type Provider = "anthropic" | "openai";

/** Providers that have a key configured, in the order we should try them. */
function providerOrder(): Provider[] {
  const has: Record<Provider, boolean> = {
    anthropic: Boolean(process.env["ANTHROPIC_API_KEY"]),
    openai: Boolean(process.env["OPENAI_API_KEY"]),
  };
  const prefer = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  // Default preference: OpenAI first (current primary), Anthropic as backup.
  const order: Provider[] = prefer === "anthropic" ? ["anthropic", "openai"] : ["openai", "anthropic"];
  return order.filter((p) => has[p]);
}

export function llmEnabled(): boolean {
  return providerOrder().length > 0;
}

/** Which provider will be tried first (for logging/telemetry). */
export function llmProvider(): Provider | "none" {
  return providerOrder()[0] ?? "none";
}

async function callAnthropic(
  opts: { system: string; user: string; maxTokens: number },
): Promise<string | null> {
  const key = process.env["ANTHROPIC_API_KEY"]!;
  const model = process.env["CONCIERGE_MODEL"] ?? "claude-sonnet-4-5";
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  if (!res.ok) {
    logger.error({ status: res.status }, "llm: anthropic error");
    return null;
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || null;
}

async function callOpenAI(
  opts: { system: string; user: string; maxTokens: number },
): Promise<string | null> {
  const key = process.env["OPENAI_API_KEY"]!;
  const model = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    logger.error({ status: res.status }, "llm: openai error");
    return null;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  return text || null;
}

export async function llmComplete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  const max = opts.maxTokens ?? 400;
  const args = { system: opts.system, user: opts.user, maxTokens: max };

  for (const provider of providerOrder()) {
    try {
      const text =
        provider === "anthropic" ? await callAnthropic(args) : await callOpenAI(args);
      if (text) return text; // success — stop here
      // null = this provider errored/empty; fall through to the next one.
    } catch (err) {
      logger.error({ err, provider }, "llm: request threw, trying next provider");
    }
  }
  return null;
}
