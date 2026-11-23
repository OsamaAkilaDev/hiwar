import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatStreamRequest, type StreamEvent } from "../../shared/events";
import { encodeEvent } from "../../shared/sse";
import { db } from "../db/client";
import { getConversation, setConversationTitle } from "../db/conversations";
import {
  getMessage,
  insertUserMessage,
  recentMessages,
  saveAssistantMessage,
} from "../db/messages";
import { SEED_USER_ID } from "../db/schema";
import { providersFromEnv, streamChat } from "../llm/gateway";
import { systemPrompt } from "../llm/prompts/system";
import { generateTitle } from "../llm/title";
import type { ChatMessage, Provider } from "../llm/types";
import { type Context, contextFor, touch } from "../memory/retrieve";

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
      const { found } = await insertUserMessage(database, {
        userId,
        conversationId,
        id: userMessageId,
        text,
        lang: /[؀-ۿ]/.test(text) ? "ar" : "en",
      });
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
          const [existing, recent, conversation, context] = await Promise.all([
            getMessage(database, userId, assistantMessageId),
            recentMessages(database, userId, conversationId),
            getConversation(database, userId, conversationId),
            memory ? contextFor(database, c.env, userId, text) : known,
          ]);
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

        try {
          for await (const chunk of streamChat(
            providers,
            [
              {
                role: "system",
                content: systemPrompt(locale, {
                  facts: known.facts,
                  memories: known.memories.map((m) => m.content),
                }),
              },
              ...history,
            ],
            { signal },
          )) {
            provider = chunk.provider;
            ttftMs ??= Date.now() - startedAt;
            content += chunk.text;
            await send({ type: "delta", text: chunk.text });
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

        console.log(
          JSON.stringify({
            route: "chat.stream",
            conversationId,
            provider: provider?.name,
            model: provider?.model,
            ttftMs,
            totalMs: Date.now() - startedAt,
            chars: content.length,
            status,
          }),
        );
      })();
      c.executionCtx.waitUntil(turn);
      return turn;
    });
  },
);
