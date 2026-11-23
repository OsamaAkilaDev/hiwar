import { mockProvider } from "./providers/mock";
import { openAICompatible } from "./providers/openai-compatible";
import type { ChatMessage, Provider } from "./types";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export function providersFromEnv(env: Env): Provider[] {
  return env.LLM_PROVIDERS.split(",").map((raw) => {
    const name = raw.trim();
    switch (name) {
      case "mock":
        return mockProvider();
      case "gemini":
        return openAICompatible({
          name,
          baseURL: GEMINI_BASE_URL,
          apiKey: env.GEMINI_API_KEY,
          model: env.GEMINI_MODEL,
        });
      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  });
}

type Options = { signal: AbortSignal; firstTokenTimeoutMs?: number };

export async function* streamChat(
  providers: Provider[],
  messages: ChatMessage[],
  { signal, firstTokenTimeoutMs = 3000 }: Options,
): AsyncGenerator<{ provider: Provider; text: string }> {
  const failures: string[] = [];

  for (const provider of providers) {
    signal.throwIfAborted();
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    signal.addEventListener("abort", abort, { once: true });
    const iterator = provider
      .stream(messages, attempt.signal)
      [Symbol.asyncIterator]();

    let first: IteratorResult<string>;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`no token within ${firstTokenTimeoutMs}ms`)),
          firstTokenTimeoutMs,
        );
      });
      const next = iterator.next();
      next.catch(() => {}); // a late rejection after a timeout is expected
      first = await Promise.race([next, timeout]);
      if (first.done) throw new Error("empty response");
    } catch (error) {
      attempt.abort();
      iterator.return?.()?.catch(() => {});
      signal.removeEventListener("abort", abort);
      if (signal.aborted) throw error;
      failures.push(`${provider.name}: ${errorMessage(error)}`);
      console.warn(`provider ${provider.name} skipped: ${errorMessage(error)}`);
      continue;
    } finally {
      clearTimeout(timer);
    }

    try {
      for (
        let r: IteratorResult<string> = first;
        !r.done;
        r = await iterator.next()
      ) {
        yield { provider, text: r.value };
      }
    } finally {
      signal.removeEventListener("abort", abort);
      attempt.abort();
    }
    return;
  }

  throw new Error(`All providers failed. ${failures.join("; ")}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
