// Default provider: Anthropic through the official SDK. Adaptive thinking, streaming, prompt caching on the
// stable system blocks, and tool use for structured output (forced tool_choice is not accepted on this
// model family, so the prompt names the tool and tool_choice stays "auto").
import Anthropic from "@anthropic-ai/sdk";
import type { CallInput, Provider } from "./types.ts";

export function createAnthropicProvider(apiKey: string, model: string, client: Anthropic = new Anthropic({ apiKey })): Provider {
  return {
    id: "anthropic",
    label: `Anthropic ${model}`,
    async call(input: CallInput) {
      const content: Anthropic.ContentBlockParam[] = [];
      if (input.image) {
        content.push({ type: "image", source: { type: "base64", media_type: input.image.mime as "image/png", data: input.image.base64 } });
      }
      content.push({ type: "text", text: `${input.user}\n\nAnswer by calling the ${input.tool.name} tool.` });
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 64_000,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          system: input.system.map((b) => ({
            type: "text" as const,
            text: b.text,
            ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
          })),
          tools: [{
            name: input.tool.name,
            description: input.tool.description,
            input_schema: input.tool.schema as Anthropic.Tool.InputSchema,
            eager_input_streaming: true,
          }],
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content }],
        },
        { signal: input.signal },
      );
      let raw = "";
      stream.on("inputJson", (delta) => {
        raw += delta;
        input.onPartial?.(raw);
      });
      let message;
      try {
        message = await stream.finalMessage();
      } catch (error) {
        // Never echo the SDK error verbatim: request details can include headers.
        throw new Error(
          `Anthropic request failed: ${
            error instanceof Anthropic.APIError ? `${error.status ?? ""} ${error.message}`.slice(0, 200) : "network or timeout error"
          }`,
        );
      }
      if (message.stop_reason === "refusal") throw new Error("The model declined this request. Rephrase the brief.");
      if (message.stop_reason === "max_tokens") {
        throw new Error("The answer was cut off (too long). Ask for fewer variants or a smaller screen.");
      }
      const use = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === input.tool.name);
      if (!use) throw new Error("The model answered without calling the design tool. Try again.");
      return use.input;
    },
  };
}
