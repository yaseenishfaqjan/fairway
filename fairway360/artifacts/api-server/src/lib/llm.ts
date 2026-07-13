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

// ── Tool calling (function calling) ─────────────────────────────────────────
// Used by the Kitchen agent to actually place orders. Currently implemented
// for OpenAI (the primary provider). If OpenAI isn't the active provider or the
// call fails, returns { kind: "text" } from llmComplete so the chat still works.

export type LlmTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
};

export type LlmToolResult =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; args: Record<string, unknown> };

export async function llmCompleteWithTools(opts: {
  system: string;
  user: string;
  tools: LlmTool[];
  maxTokens?: number;
  model?: string;
}): Promise<LlmToolResult | null> {
  const openaiKey = process.env["OPENAI_API_KEY"];
  const max = opts.maxTokens ?? 400;

  // Tool calling path — OpenAI only.
  if (openaiKey && providerOrder().includes("openai")) {
    try {
      // Transactional flows (taking orders) use a stronger default model for
      // reliable tool calling; override with ORDER_MODEL.
      const model = opts.model ?? process.env["ORDER_MODEL"] ?? "gpt-4o";
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: max,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          tools: opts.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
          tool_choice: "auto",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: {
            message?: {
              content?: string;
              tool_calls?: { function?: { name?: string; arguments?: string } }[];
            };
          }[];
        };
        const msg = data.choices?.[0]?.message;
        const call = msg?.tool_calls?.[0]?.function;
        if (call?.name) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.arguments ?? "{}");
          } catch {
            /* leave empty */
          }
          return { kind: "tool", name: call.name, args };
        }
        if (msg?.content?.trim()) return { kind: "text", text: msg.content.trim() };
      } else {
        logger.error({ status: res.status }, "llm: openai tool-call error");
      }
    } catch (err) {
      logger.error({ err }, "llm: tool-call request failed");
    }
  }

  // Fallback: plain text (no tools) via the normal provider chain.
  const text = await llmComplete({ system: opts.system, user: opts.user, maxTokens: max });
  return text ? { kind: "text", text } : null;
}
