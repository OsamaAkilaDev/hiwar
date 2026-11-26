// Streams a reply from the first provider that works. A provider that fails
// before its first token, or rate-limits, hands the turn to the next one.
import { mockProvider } from "./providers/mock";
import { openAICompatible } from "./providers/openai-compatible";
import type { ChatMessage, Provider, Tool, ToolCall } from "./types";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/";

export function providersFromEnv(env: Env): Provider[] {
  const names = env.LLM_PROVIDERS.split(",").map((raw) => raw.trim());
  // The fallback is optional: without its key, Gemini runs alone.
  return names.flatMap((name) => {
    switch (name) {
      case "mock":
        return mockProvider();
      case "gemini":
        return openAICompatible({
          name,
          baseURL: GEMINI_BASE_URL,
          apiKey: env.GEMINI_API_KEY,
          model: env.GEMINI_MODEL,
          tools: true,
        });
      case "groq":
        return env.GROQ_API_KEY
          ? openAICompatible({
              name,
              baseURL: GROQ_BASE_URL,
              apiKey: env.GROQ_API_KEY,
              model: env.GROQ_MODEL,
              tools: true,
            })
          : [];
      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  });
}

type Options = {
  signal: AbortSignal;
  /** Offered only to providers whose capability flag says tools work. */
  tools?: Tool[];
  firstTokenTimeoutMs?: number;
  lastProviderTimeoutMs?: number;
};

export async function* streamChat(
  providers: Provider[],
  messages: ChatMessage[],
  {
    signal,
    tools,
    firstTokenTimeoutMs = 3000,
    lastProviderTimeoutMs = 15_000,
  }: Options,
): AsyncGenerator<{
  provider: Provider;
  text: string;
  toolCall?: ToolCall;
  /** The attempt died mid-reply; drop its text, another one follows. */
  reset?: boolean;
}> {
  const failures: string[] = [];
  // Free tiers drop streams under load (a 503 after a few tokens), usually
  // for a moment: every provider gets one retry.
  const attempts = providers.flatMap((p) => [p, p]);

  for (const [i, provider] of attempts.entries()) {
    // A short cutoff only pays off when another attempt can take over.
    const timeoutMs =
      i < attempts.length - 1 ? firstTokenTimeoutMs : lastProviderTimeoutMs;
    signal.throwIfAborted();
    if (failures.length) await new Promise((r) => setTimeout(r, 500));
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    signal.addEventListener("abort", abort, { once: true });
    const iterator = provider
      .stream(messages, attempt.signal, provider.tools ? tools : undefined)
      [Symbol.asyncIterator]();

    let first: IteratorResult<string | ToolCall>;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`no token within ${timeoutMs}ms`)),
          timeoutMs,
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
        let r: IteratorResult<string | ToolCall> = first;
        !r.done;
        r = await iterator.next()
      ) {
        yield typeof r.value === "string"
          ? { provider, text: r.value }
          : { provider, text: "", toolCall: r.value };
      }
      return;
    } catch (error) {
      if (signal.aborted || i === attempts.length - 1) throw error;
      failures.push(`${provider.name}: ${errorMessage(error)}`);
      console.warn(`provider ${provider.name} cut: ${errorMessage(error)}`);
      yield { provider, text: "", reset: true };
    } finally {
      signal.removeEventListener("abort", abort);
      attempt.abort();
    }
  }

  throw new Error(`All providers failed. ${failures.join("; ")}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
