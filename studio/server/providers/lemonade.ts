// Local AI through Lemonade Server's OpenAI-compatible API (POST {base}/chat/completions, streamed). Structured output:
// first as a JSON Schema `response_format` (llama.cpp enforces it while sampling); if the server rejects that, a strict-JSON
// prompt instead. Either way the answer is validated against the tool schema and sent back up to twice when it is wrong,
// because small local models drift. The UI labels this provider "slower and weaker than a cloud model".
import { extractJson, validateJson } from "../../shared/jsonSchema.ts";
import type { LemonadeClient } from "../lemonade.ts";
import type { CallInput, Provider } from "./types.ts";

const RETRIES = 2;
const MAX_TOKENS = 16_384;

type Message = { role: string; content: unknown };

export interface LemonadeProviderOptions {
  client: LemonadeClient;
  /** The model to chat with, resolved on every call (the loaded one, or LEMONADE_MODEL). */
  model: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
}

export function createLemonadeProvider(opts: LemonadeProviderOptions): Provider {
  const { client } = opts;
  const doFetch = opts.fetchImpl ?? fetch;
  // Remembered per provider: once a server rejected response_format, stop sending it.
  let schemaSupported = true;

  async function chat(model: string, messages: Message[], input: CallInput, withSchema: boolean): Promise<string> {
    const res = await doFetch(`${client.base}/chat/completions`, {
      method: "POST",
      signal: input.signal,
      headers: client.headers(true),
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages,
        // Qwen-style models spend thousands of tokens thinking first; design pages do not need it.
        chat_template_kwargs: { enable_thinking: false },
        ...(withSchema
          ? {
            response_format: {
              type: "json_schema",
              json_schema: { name: input.tool.name, strict: true, schema: input.tool.schema },
            },
          }
          : {}),
      }),
    }).catch(() => {
      throw new Error(
        `Cannot reach Lemonade at ${client.base}. Start it (the tray app, or "lemond"), or change LEMONADE_BASE_URL in .env.`,
      );
    });
    if (!res.ok || !res.body) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new LemonadeHttpError(res.status, `Lemonade answered ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    let raw = "";
    let buffer = "";
    const dec = new TextDecoder();
    for await (const chunk of res.body) {
      buffer += dec.decode(chunk, { stream: true });
      let at: number;
      while ((at = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, at).trim();
        buffer = buffer.slice(at + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            raw += delta;
            input.onPartial?.(raw);
          }
        } catch {
          // A keep-alive or a partial line: ignore it.
        }
      }
    }
    return raw;
  }

  return {
    id: "lemonade",
    label: "Local AI (Lemonade)",
    note: "Runs on this computer: private and free, but slower and weaker than a cloud model.",
    async call(input) {
      const model = await opts.model();
      if (!model) throw new Error("No local model is loaded. Open the model panel and set up Local AI.");
      const system = input.system.map((b) => b.text).join("\n\n");
      const strict =
        `Return only one JSON object that matches this JSON Schema (${input.tool.description}). No prose, no code fences.\nSchema: ${
          JSON.stringify(input.tool.schema)
        }`;
      const userContent = input.image
        ? [{ type: "image_url", image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` } }, {
          type: "text",
          text: input.user,
        }]
        : input.user;
      const messages: Message[] = [{ role: "system", content: `${system}\n\n${strict}` }, {
        role: "user",
        content: userContent,
      }];
      let lastProblem = "";
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        let raw: string;
        try {
          raw = await chat(model, messages, input, schemaSupported);
        } catch (e) {
          if (
            schemaSupported && e instanceof LemonadeHttpError &&
            (e.status === 400 || e.status === 422 || e.status === 501)
          ) {
            schemaSupported = false; // fall back to the strict prompt for this and later calls
            raw = await chat(model, messages, input, false);
          } else throw e;
        }
        try {
          const value = extractJson(raw);
          const problems = validateJson(value, input.tool.schema);
          if (problems.length === 0) return value;
          lastProblem = problems.slice(0, 5).join("; ");
        } catch (e) {
          lastProblem = e instanceof Error ? e.message : String(e);
        }
        messages.push({ role: "assistant", content: raw.slice(0, 20_000) }, {
          role: "user",
          content: `That answer is not valid: ${lastProblem}. Return only the corrected JSON object.`,
        });
      }
      throw new Error(
        `The local model could not produce a valid answer after ${
          RETRIES + 1
        } tries (${lastProblem}). Try a larger model or a smaller request.`,
      );
    },
  };
}

class LemonadeHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
