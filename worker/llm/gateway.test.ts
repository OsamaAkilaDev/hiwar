import { expect, test } from "bun:test";
import { streamChat } from "./gateway";
import type { Provider } from "./types";

const messages = [{ role: "user" as const, content: "hi" }];

function fake(name: string, stream: Provider["stream"]): Provider {
  return { name, model: name, stream };
}

async function collect(gen: AsyncGenerator<{ text: string }>) {
  const out: string[] = [];
  for await (const { text } of gen) out.push(text);
  return out;
}

test("falls through when first provider throws before first token", async () => {
  const bad = fake("bad", async function* () {
    yield* [];
    throw new Error("boom");
  });
  const good = fake("good", async function* () {
    yield "ok";
  });
  const out = await collect(
    streamChat([bad, good], messages, { signal: new AbortController().signal }),
  );
  expect(out).toEqual(["ok"]);
});

test("falls through when first provider exceeds firstTokenTimeoutMs", async () => {
  let aborted = false;
  const slow = fake("slow", async function* (_m, signal) {
    signal.addEventListener("abort", () => {
      aborted = true;
    });
    await new Promise((r) => setTimeout(r, 500));
    yield "late";
  });
  const good = fake("good", async function* () {
    yield "ok";
  });
  const out = await collect(
    streamChat([slow, good], messages, {
      signal: new AbortController().signal,
      firstTokenTimeoutMs: 50,
    }),
  );
  expect(out).toEqual(["ok"]);
  expect(aborted).toBe(true);
});

test("a stream cut mid-reply is reset and retried, then gives up", async () => {
  let calls = 0;
  const flaky = fake("flaky", async function* () {
    yield `part${++calls}`;
    if (calls < 3) throw new Error("503 mid-stream");
    yield "ok";
  });
  const seen: { text: string; reset?: boolean }[] = [];
  const run = async () => {
    for await (const { text, reset } of streamChat([flaky], messages, {
      signal: new AbortController().signal,
    }))
      seen.push(reset ? { text, reset } : { text });
  };
  // One provider gets two attempts; both die, so the error surfaces.
  await expect(run()).rejects.toThrow("503 mid-stream");
  expect(seen).toEqual([
    { text: "part1" },
    { text: "", reset: true },
    { text: "part2" },
  ]);
});

test("falls through when first provider ends without a token", async () => {
  const empty = fake("empty", async function* () {
    yield* [];
  });
  const good = fake("good", async function* () {
    yield "ok";
  });
  const out = await collect(
    streamChat([empty, good], messages, {
      signal: new AbortController().signal,
    }),
  );
  expect(out).toEqual(["ok"]);
});

test("waits longer for the last provider, since nothing can take over", async () => {
  const slow = fake("slow", async function* () {
    await Bun.sleep(100);
    yield "late";
  });
  const out = await collect(
    streamChat([slow], messages, {
      signal: new AbortController().signal,
      firstTokenTimeoutMs: 50,
    }),
  );
  expect(out).toEqual(["late"]);
});
