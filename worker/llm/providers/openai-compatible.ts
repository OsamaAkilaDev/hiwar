import type { ChatMessage, Provider, Tool, ToolCall } from "../types";

type Options = {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  tools?: boolean;
};

// extra_content carries Gemini's thought signatures; other providers reject it.
// Gemini 400s on a tool call without one (a call another model made), so those
// get Google's documented placeholder.
const NO_SIGNATURE = {
  google: { thought_signature: "skip_thought_signature_validator" },
};
const toWire = (m: ChatMessage, extra: boolean) => {
  if (m.role === "tool") {
    return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
  }
  if (m.role === "assistant" && m.toolCalls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.args },
        ...(extra ? { extra_content: c.extra ?? NO_SIGNATURE } : {}),
      })),
    };
  }
  return { role: m.role, content: m.content };
};

type WireCall = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
  extra_content?: unknown;
};

export function openAICompatible({
  name,
  baseURL,
  apiKey,
  model,
  tools = false,
}: Options): Provider {
  return {
    name,
    model,
    tools,
    async *stream(
      messages: ChatMessage[],
      signal: AbortSignal,
      offered?: Tool[],
    ) {
      const response = await fetch(`${baseURL}chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) =>
            toWire(m, baseURL.includes("googleapis")),
          ),
          stream: true,
          ...(offered?.length
            ? {
                tools: offered.map((t) => ({ type: "function", function: t })),
              }
            : {}),
        }),
        signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.text();
        throw new Error(`${response.status} ${body.slice(0, 300)}`);
      }

      // Tool-call deltas arrive in pieces (name first, arguments split across
      // chunks), keyed by index; they are emitted whole once the stream ends.
      const calls: ToolCall[] = [];
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";
      let tail = "";
      try {
        read: for (;;) {
          const { done, value } = await reader.read();
          buffer += done ? "\n" : value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            // Gemini sends a mid-stream failure as a bare JSON error body.
            if (!line.startsWith("data: ")) {
              if (tail.length < 300) tail += line.trim();
              continue;
            }
            const data = line.slice(6).trim();
            if (data === "[DONE]") break read;
            const delta = JSON.parse(data).choices?.[0]?.delta;
            if (delta?.content) yield delta.content as string;
            for (const [i, part] of (
              (delta?.tool_calls ?? []) as WireCall[]
            ).entries()) {
              const at = part.index ?? i;
              calls[at] ??= { id: "", name: "", args: "" };
              const call = calls[at];
              if (part.id) call.id = part.id;
              if (part.function?.name) call.name += part.function.name;
              if (part.function?.arguments)
                call.args += part.function.arguments;
              if (part.extra_content) call.extra = part.extra_content;
            }
          }
          // A body that ends without [DONE] was cut (dropped connection,
          // upstream restart): failing here saves it as cut_off, not complete.
          if (done) throw new Error(`stream ended before [DONE] ${tail}`);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      for (const [i, call] of calls.entries()) {
        if (call?.name) yield { ...call, id: call.id || `call_${i}` };
      }
    },
  };
}
