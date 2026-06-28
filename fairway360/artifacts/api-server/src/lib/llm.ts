// Provider-agnostic LLM helper. Uses Anthropic when ANTHROPIC_API_KEY is set,
// otherwise OpenAI when OPENAI_API_KEY is set, otherwise returns null so callers
// fall back to a deterministic reply. Pure REST (no SDK).

import { logger } from "./logger";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export function llmEnabled(): boolean {
  return Boolean(process.env["ANTHROPIC_API_KEY"] || process.env["OPENAI_API_KEY"]);
}

/** Which provider is active (for logging/telemetry). */
export function llmProvider(): "anthropic" | "openai" | "none" {
  if (process.env["ANTHROPIC_API_KEY"]) return "anthropic";
  if (process.env["OPENAI_API_KEY"]) return "openai";
  return "none";
}

export async function llmComplete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  const max = opts.maxTokens ?? 400;
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];

  try {
    if (anthropicKey) {
      const model = process.env["CONCIERGE_MODEL"] ?? "claude-sonnet-4-6";
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: max,
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

    if (openaiKey) {
      const model = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: max,
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

    return null;
  } catch (err) {
    logger.error({ err }, "llm: request failed");
    return null;
  }
}
