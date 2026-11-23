import { describe, expect, test } from "bun:test";
import type { StreamEvent } from "./events";
import { encodeEvent, parseEventStream } from "./sse";

const messageId = "0190a1b2-0000-7000-8000-000000000000";
const delta = (seq: number, text: string): StreamEvent => ({
  type: "delta",
  messageId,
  seq,
  text,
});

const streamOf = (...chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const collect = async (body: ReadableStream<Uint8Array>) => {
  const events: StreamEvent[] = [];
  for await (const event of parseEventStream(body)) events.push(event);
  return events;
};

describe("parseEventStream", () => {
  test("parses two events delivered in one chunk", async () => {
    const events = [delta(1, "a"), delta(2, "b")];
    const bytes = new TextEncoder().encode(events.map(encodeEvent).join(""));
    expect(await collect(streamOf(bytes))).toEqual(events);
  });

  test("parses one event split across three chunks", async () => {
    const event = delta(1, "hello");
    const bytes = new TextEncoder().encode(encodeEvent(event));
    const a = Math.floor(bytes.length / 3);
    const chunks = [
      bytes.slice(0, a),
      bytes.slice(a, 2 * a),
      bytes.slice(2 * a),
    ];
    expect(await collect(streamOf(...chunks))).toEqual([event]);
  });

  test("decodes Arabic split mid-character", async () => {
    const event = delta(1, "مرحبا");
    const bytes = new TextEncoder().encode(encodeEvent(event));
    const cut = bytes.indexOf(0xd9) + 1;
    expect(
      await collect(streamOf(bytes.slice(0, cut), bytes.slice(cut))),
    ).toEqual([event]);
  });

  test("ignores comments and keep-alives, rejects invalid events", async () => {
    const encoder = new TextEncoder();
    const ok = encoder.encode(`: ping\n\n\n${encodeEvent(delta(1, "a"))}`);
    expect(await collect(streamOf(ok))).toEqual([delta(1, "a")]);
    expect(
      collect(streamOf(encoder.encode('data: {"type":"nope"}\n\n'))),
    ).rejects.toThrow();
  });
});
