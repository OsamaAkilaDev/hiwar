import type { StreamEvent } from "./events";

export const encodeEvent = (event: StreamEvent) =>
  `data: ${JSON.stringify(event)}\n\n`;

const parseBlock = (block: string) => {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  // Not validated: the events come from our own Worker, and zod would add
  // ~25 KB gzip to the first load. The Worker validates what it receives.
  return data ? (JSON.parse(data) as StreamEvent) : undefined;
};

export async function* parseEventStream(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
): AsyncGenerator<StreamEvent> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? "\n\n" : value;
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        const event = parseBlock(block);
        if (event) yield event;
      }
      if (done) return;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
