import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatStreamRequest, type StreamEvent } from "../../shared/events";
import { langOf } from "../../shared/lang";
import { encodeEvent } from "../../shared/sse";
import { db } from "../db/client";
import { getConversation, setConversationTitle } from "../db/conversations";
import {
  getMessage,
  insertUserMessage,
  recentMessages,
  saveAssistantMessage,
} from "../db/messages";
import { withRetry } from "../db/retry";
import { SEED_USER_ID } from "../db/schema";
import { providersFromEnv, streamChat } from "../llm/gateway";
import { systemPrompt } from "../llm/prompts/system";
import { generateTitle } from "../llm/title";
import type { ChatMessage, Provider, ToolCall } from "../llm/types";
import { extractMemories } from "../memory/extract";
import { type Context, contextFor, touch } from "../memory/retrieve";
import {
  formatResults,
  MAX_SEARCHES,
  queryOf,
  SEARCH_TOOL,
  SEARCH_UNAVAILABLE,
  webSearch,
} from "../tools/search";

const TITLE_TIMEOUT_MS = 5000;

type Payload<E = StreamEvent> = E extends unknown
  ? Omit<E, "messageId" | "seq">
  : never;

// Per-IP limit so a public URL can't drain the free model quota.
export const chat = new Hono<{ Bindings: Env }>().post(
  "/chat/stream",
  async (c, next) => {
    const key = c.req.header("cf-connecting-ip") ?? "local";
    const { success } = await c.env.CHAT_LIMITER.limit({ key });
    return success ? next() : c.json({ error: "rate_limited" }, 429);
  },
  async (c) => {
    const parsed = ChatStreamRequest.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const {
      conversationId,
      userMessageId,
      assistantMessageId,
      text,
      locale,
      memory,
    } = parsed.data;

    const userId = SEED_USER_ID;
    const database = db(c.env);
    try {
      const { found } = await withRetry(() =>
        insertUserMessage(database, {
          userId,
          conversationId,
          id: userMessageId,
          text,
          lang: langOf(text),
        }),
      );
      if (!found) return c.json({ error: "not_found" }, 404);
    } catch (error) {
      console.error("chat.stream insert failed", error);
      return c.json({ error: "server" }, 500);
    }

    // Register the whole turn with waitUntil: once the client disconnects the
    // runtime may cancel unregistered work, and the "stopped" save must run.
    return streamSSE(c, (stream) => {
      const turn = (async () => {
        const startedAt = Date.now();
        // The client is gone when either the request aborts or the response
        // stream is cancelled; dev proxies don't always surface the former.
        const upstream = new AbortController();
        const disconnect = () => upstream.abort();
        c.req.raw.signal.addEventListener("abort", disconnect, { once: true });
        stream.onAbort(disconnect);
        const { signal } = upstream;
        let seq = 0;
        const send = (event: Payload) =>
          stream.write(
            encodeEvent({
              ...event,
              messageId: assistantMessageId,
              seq: seq++,
            } as StreamEvent),
          );

        await send({ type: "start" });

        let history: ChatMessage[];
        let known: Context = { facts: [], memories: [] };
        let wantsTitle = false;
        try {
          const [existing, recent, conversation, context] = await withRetry(
            () =>
              Promise.all([
                getMessage(database, userId, assistantMessageId),
                recentMessages(database, userId, conversationId),
                getConversation(database, userId, conversationId),
                memory ? contextFor(database, c.env, userId, text) : known,
              ]),
          );
          if (existing) {
            await send({ type: "done", message: existing });
            return;
          }
          known = context;
          wantsTitle =
            !conversation?.title &&
            recent.filter((m) => m.role === "user").length === 1;
          history = recent
            .filter(
              (m) =>
                m.content && m.status !== "error" && m.status !== "streaming",
            )
            .map(({ role, content }) => ({ role, content }));
        } catch (error) {
          console.error("chat.stream context failed", error);
          await send({
            type: "error",
            code: "server",
            retryable: true,
          });
          return;
        }

        c.executionCtx.waitUntil(
          touch(
            database,
            known.memories.map((m) => m.id),
          ),
        );

        const providers = providersFromEnv(c.env);
        const titleAbort = new AbortController();
        const title = wantsTitle
          ? generateTitle(providers, text, titleAbort.signal)
          : null;

        let content = "";
        let provider: Provider | undefined;
        let ttftMs: number | undefined;
        let failed = false;
        const citations: { title: string; url: string }[] = [];

        const thread: ChatMessage[] = [
          {
            role: "system",
            content: systemPrompt(locale, {
              facts: known.facts,
              memories: known.memories.map((m) => m.content),
            }),
          },
          ...history,
        ];
        let searches = 0;

        // Tool loop: stream; if the model asked to search, run it, hand the
        // results back and stream again. Past the cap the tool is withdrawn,
        // so the model has to answer.
        try {
          for (;;) {
            const calls: ToolCall[] = [];
            let roundText = "";
            for await (const chunk of streamChat(providers, thread, {
              signal,
              tools: searches < MAX_SEARCHES ? [SEARCH_TOOL] : undefined,
            })) {
              provider = chunk.provider;
              if (chunk.toolCall) {
                calls.push(chunk.toolCall);
                continue;
              }
              ttftMs ??= Date.now() - startedAt;
              roundText += chunk.text;
              content += chunk.text;
              await send({ type: "delta", text: chunk.text });
            }
            if (!calls.length) break;

            thread.push({
              role: "assistant",
              content: roundText,
              toolCalls: calls,
            });
            for (const call of calls) {
              const query = queryOf(call.args);
              let result = "Search limit reached for this reply.";
              if (searches < MAX_SEARCHES) {
                searches++;
                await send({ type: "tool_start", name: call.name, query });
                try {
                  const results = await webSearch(
                    c.env.TAVILY_API_KEY,
                    query,
                    signal,
                  );
                  const found = results
                    .filter((r) => !citations.some((s) => s.url === r.url))
                    .map(({ title, url }) => ({ title, url }));
                  citations.push(...found);
                  await send({ type: "tool_result", citations: found });
                  result = formatResults(results);
                } catch (error) {
                  if (signal.aborted) throw error;
                  console.error("chat.search failed", error);
                  await send({ type: "tool_result", citations: [] });
                  result = SEARCH_UNAVAILABLE;
                }
              }
              thread.push({
                role: "tool",
                toolCallId: call.id,
                content: result,
              });
            }
          }
        } catch (error) {
          failed = true;
          if (!signal.aborted) console.error("chat.stream failed", error);
        }
        const status = signal.aborted
          ? "stopped"
          : failed
            ? "error"
            : "complete";
        const error =
          status === "error"
            ? {
                code:
                  ttftMs === undefined
                    ? ("unavailable" as const)
                    : ("cut_off" as const),
                retryable: true,
              }
            : undefined;

        const saved = saveAssistantMessage(database, {
          id: assistantMessageId,
          conversationId,
          content,
          status,
          provider: provider?.name ?? null,
          model: provider?.model ?? null,
          error,
          citations,
        });

        const message = await saved;
        if (status !== "stopped") {
          await send(
            error ? { type: "error", ...error } : { type: "done", message },
          );
        }

        if (title) {
          const timer = setTimeout(() => titleAbort.abort(), TITLE_TIMEOUT_MS);
          try {
            const generated = await title;
            if (generated) {
              await setConversationTitle(
                database,
                userId,
                conversationId,
                generated,
              );
              if (status !== "stopped") {
                await send({ type: "title", title: generated });
              }
            }
          } catch (error) {
            console.error("chat.title save failed", error);
          } finally {
            clearTimeout(timer);
          }
        }

        if (memory && !(failed && ttftMs === undefined)) {
          c.executionCtx.waitUntil(
            extractMemories(database, c.env, providers, userId, conversationId),
          );
        }

        console.log(
          JSON.stringify({
            route: "chat.stream",
            conversationId,
            provider: provider?.name,
            model: provider?.model,
            ttftMs,
            totalMs: Date.now() - startedAt,
            chars: content.length,
            searches,
            status,
          }),
        );
      })();
      c.executionCtx.waitUntil(turn);
      return turn;
    });
  },
);
