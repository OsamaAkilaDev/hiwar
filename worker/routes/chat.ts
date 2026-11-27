// POST /api/chat/stream: save the user message, gather context, stream the
// reply as SSE (with the web_search tool loop), then save the reply and run
// the title and memory jobs after the response.

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatStreamRequest, type StreamEvent } from "../../shared/events";
import { langOf } from "../../shared/lang";
import { encodeEvent } from "../../shared/sse";
import {
  type AppEnv,
  ensureUser,
  GUEST_MESSAGES,
  guestMessagesUsed,
} from "../auth";
import { db } from "../db/client";
import { getConversation, setConversationTitle } from "../db/conversations";
import {
  getMessage,
  insertUserMessage,
  recentMessages,
  saveAssistantMessage,
} from "../db/messages";
import { withRetry } from "../db/retry";
import { providersFromEnv, streamChat } from "../llm/gateway";
import { LAST_WORD, systemPrompt } from "../llm/prompts/system";
import { generateTitle } from "../llm/title";
import type { ChatMessage, Provider, ToolCall } from "../llm/types";
import { extractMemories } from "../memory/extract";
import { type Context, contextFor, touch } from "../memory/retrieve";
import {
  flattenTools,
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
export const chat = new Hono<AppEnv>().post(
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
      model,
    } = parsed.data;

    const database = db(c.env);
    let userId: string;
    try {
      const user = await ensureUser(c, database, locale);
      userId = user.id;
      // A retry resends the same message id, so it doesn't count twice.
      if (
        !user.email &&
        (await guestMessagesUsed(database, userId, userMessageId)) >=
          GUEST_MESSAGES
      ) {
        return c.json({ error: "sign_in_required" }, 403);
      }
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
        // Untitled chats (a title call that failed, say while the model was
        // down) try again on every turn, from the chat's first question.
        let titleFrom: string | null = null;
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
          titleFrom = conversation?.title
            ? null
            : (recent.find((m) => m.role === "user")?.content ?? text);
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

        // The chosen provider goes first; the others stay as fallback.
        const providers = providersFromEnv(c.env).sort(
          (a, b) => Number(b.name === model) - Number(a.name === model),
        );
        const titleAbort = new AbortController();
        const title = titleFrom
          ? generateTitle(providers, titleFrom, titleAbort.signal)
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
          { role: "system", content: LAST_WORD },
        ];
        let searches = 0;

        // Tool loop: stream; if the model asked to search, run it, hand the
        // results back and stream again. At the cap the last call gets no tools
        // and a plain-text history (flattenTools), so it can only answer.
        try {
          for (;;) {
            const last = searches >= MAX_SEARCHES;
            const calls: ToolCall[] = [];
            let roundText = "";
            for await (const chunk of streamChat(
              providers,
              last ? flattenTools(thread) : thread,
              { signal, tools: last ? undefined : [SEARCH_TOOL] },
            )) {
              provider = chunk.provider;
              if (chunk.reset) {
                content = content.slice(0, content.length - roundText.length);
                roundText = "";
                calls.length = 0;
                await send({ type: "reset", text: content });
                continue;
              }
              if (chunk.toolCall) {
                calls.push(chunk.toolCall);
                continue;
              }
              ttftMs ??= Date.now() - startedAt;
              roundText += chunk.text;
              content += chunk.text;
              await send({ type: "delta", text: chunk.text });
            }
            if (!calls.length || last) break;

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
                  const before = citations.length;
                  const numbered = results.map((r) => {
                    let at = citations.findIndex((s) => s.url === r.url);
                    if (at < 0)
                      at = citations.push({ title: r.title, url: r.url }) - 1;
                    return { ...r, n: at + 1 };
                  });
                  await send({
                    type: "tool_result",
                    citations: citations.slice(before),
                  });
                  result = formatResults(numbered);
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
