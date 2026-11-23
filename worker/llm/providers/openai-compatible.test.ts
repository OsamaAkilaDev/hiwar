import { afterEach, describe, expect, test } from "bun:test";
import { openAICompatible } from "./openai-compatible";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stubFetch = (response: Response) => {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response;
  }) as unknown as typeof fetch;
  return calls;
};

const sse = (...chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    }),
  );

const provider = openAICompatible({
  name: "test",
  baseURL: "https://api.example.com/v1/",
  apiKey: "sk-test",
  model: "m",
});

const collect = async (signal = new AbortController().signal) => {
  const out: string[] = [];
  for await (const text of provider.stream([], signal)) out.push(text);
  return out;
};

describe("openAICompatible", () => {
  test("yields content deltas across arbitrary chunk boundaries", async () => {
    stubFetch(
      sse(
        'data: {"choices":[{"delta":{"con',
        'tent":"Hi"}}]}\n\n: keep-alive\n\ndata: {"choices":[{"delta":{"content":""}}]}\n',
        '\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\nda',
        "ta: [DONE]\n\n",
      ),
    );
    expect(await collect()).toEqual(["Hi", " there"]);
  });

  test("throws status and upstream message on non-2xx", async () => {
    stubFetch(
      new Response('{"error":{"message":"rate limited"}}', { status: 429 }),
    );
    await expect(collect()).rejects.toThrow(/429.*rate limited/);
  });

  test("sends the bearer token and streaming body", async () => {
    const signal = new AbortController().signal;
    const calls = stubFetch(sse("data: [DONE]\n\n"));
    await collect(signal);
    const [{ url, init }] = calls;
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer sk-test",
      "content-type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "m",
      stream: true,
    });
    expect(init.signal).toBe(signal);
  });
});
