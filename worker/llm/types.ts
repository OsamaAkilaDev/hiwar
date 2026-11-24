/** A function call the model asked for. `extra` is echoed back untouched:
 * Gemini 3 rejects a follow-up that drops its thought signature. */
export type ToolCall = {
  id: string;
  name: string;
  args: string;
  extra?: unknown;
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; content: string; toolCallId: string };

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type Provider = {
  name: string;
  model: string;
  /** Tool calling is reliable enough to offer this provider tools. */
  tools: boolean;
  stream(
    messages: ChatMessage[],
    signal: AbortSignal,
    tools?: Tool[],
  ): AsyncIterable<string | ToolCall>;
};
