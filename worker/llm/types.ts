export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Provider = {
  name: string;
  model: string;
  stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string>;
};
