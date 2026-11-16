// One narrow seam for every model: "call this tool with JSON". Screens, patches, directions and code
// translations are all tool calls, so each provider only has to return validated JSON.
export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema of the tool input. */
  schema: Record<string, unknown>;
}

export interface SystemBlock {
  text: string;
  /** Stable blocks (DESIGN.md, tokens, kit docs) are marked so providers that support it cache them. */
  cache?: boolean;
}

export interface CallInput {
  system: SystemBlock[];
  user: string;
  image?: { mime: string; base64: string };
  tool: ToolSpec;
  /** Raw, growing JSON text of the tool input, for progressive rendering. */
  onPartial?: (partialJson: string) => void;
  signal?: AbortSignal;
}

export interface Provider {
  id: "anthropic" | "lemonade" | "ollama" | "fake";
  label: string;
  /** Shown in the UI next to the provider name. */
  note?: string;
  /** Returns the tool input the model produced. Throws a plain Error with a readable message. */
  call(input: CallInput): Promise<unknown>;
}
