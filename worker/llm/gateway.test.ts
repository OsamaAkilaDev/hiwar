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

test("does not fall through after first token", async () => {
  const dies = fake("dies", async function* () {
    yield "part";
    throw new Error("mid-stream");
  });
  const good = fake("good", async function* () {
    yield "ok";
  });
  const seen: string[] = [];
  const run = async () => {
    for await (const { text } of streamChat([dies, good], messages, {
      signal: new AbortController().signal,
    })) {
      seen.push(text);
    }
  };
  await expect(run()).rejects.toThrow("mid-stream");
  expect(seen).toEqual(["part"]);
});
