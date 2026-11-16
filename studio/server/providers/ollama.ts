// Offline/free provider: a local Ollama server through its native /api/chat endpoint. Structured output comes from
// Ollama's `format` (a JSON Schema), so the tool schema doubles as the output schema. Quality is lower than a
// frontier model: the UI labels it that way.
import type { CallInput, Provider } from "./types.ts";

export function createOllamaProvider(host: string, model: string, fetchFn: typeof fetch = fetch): Provider {
  return {
    id: "ollama",
    label: `Ollama ${model}`,
    note: "Local model: lower quality than a hosted frontier model, but free and offline.",
    async call(input: CallInput) {
      const system = input.system.map((b) => b.text).join("\n\n");
      const res = await fetchFn(`${host.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        signal: input.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          format: input.tool.schema,
          options: { temperature: 0.4, num_ctx: 32_768 },
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: `${input.user}\n\nReturn only JSON matching the schema (${input.tool.description}).`,
              ...(input.image ? { images: [input.image.base64] } : {}),
            },
          ],
        }),
      }).catch(() => {
        throw new Error(`Cannot reach Ollama at ${host}. Start it with "ollama serve" and pull the model: ollama pull ${model}`);
      });
      if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}. Is the model "${model}" pulled?`);
      let raw = "";
      let buffer = "";
      const decoder = new TextDecoder();
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const part = JSON.parse(line) as { message?: { content?: string }; error?: string };
          if (part.error) throw new Error(`Ollama: ${part.error}`.slice(0, 200));
          raw += part.message?.content ?? "";
          input.onPartial?.(raw);
        }
      }
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error("The local model did not return valid JSON. Try again or use a larger model.");
      }
    },
  };
}
