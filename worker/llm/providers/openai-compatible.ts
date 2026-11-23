import OpenAI from "openai";
import type { ChatMessage, Provider } from "../types";

type Options = {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
};

export function openAICompatible({
  name,
  baseURL,
  apiKey,
  model,
}: Options): Provider {
  // The gateway owns retries and fallback; SDK retries would hide failures
  // and eat the first-token budget.
  const client = new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  return {
    name,
    model,
    async *stream(messages: ChatMessage[], signal: AbortSignal) {
      const stream = await client.chat.completions.create(
        { model, messages, stream: true },
        { signal },
      );
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}
