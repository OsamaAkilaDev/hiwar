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
  return {
    name,
    model,
    async *stream(messages: ChatMessage[], signal: AbortSignal) {
      const response = await fetch(`${baseURL}chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.text();
        throw new Error(`${response.status} ${body.slice(0, 300)}`);
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          buffer += done ? "\n" : value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) yield text;
          }
          if (done) return;
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    },
  };
}
