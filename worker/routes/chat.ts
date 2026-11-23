import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatStreamRequest, type StreamEvent } from "../../shared/events";
import { encodeEvent } from "../../shared/sse";
import { db } from "../db/client";
import {
  getMessage,
  insertUserMessage,
  recentMessages,
  saveAssistantMessage,
} from "../db/messages";
import { providersFromEnv, streamChat } from "../llm/gateway";
import { systemPrompt } from "../llm/prompts/system";
import type { ChatMessage, Provider } from "../llm/types";

type Payload<E = StreamEvent> = E extends unknown
  ? Omit<E, "messageId" | "seq">
  : never;

export const chat = new Hono<{ Bindings: Env }>().post(
  "/chat/stream",
  async (c) => {
    const parsed = ChatStreamRequest.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const { conversationId, userMessageId, assistantMessageId, text, locale } =
      parsed.data;

    return streamSSE(c, async (stream) => {
      const startedAt = Date.now();
      // The client is gone when either the request aborts or the response
      // stream is cancelled; dev proxies don't always surface the former.
      const upstream = new AbortController();
      const disconnect = () => upstream.abort();
      c.req.raw.signal.addEventListener("abort", disconnect, { once: true });
      stream.onAbort(disconnect);
      const { signal } = upstream;
      const database = db(c.env);
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
      try {
        await insertUserMessage(database, {
          conversationId,
          id: userMessageId,
          text,
          lang: /[؀-ۿ]/.test(text) ? "ar" : "en",
        });
        const [existing, recent] = await Promise.all([
          getMessage(database, assistantMessageId),
          recentMessages(database, conversationId),
        ]);
        if (existing) {
          await send({ type: "done", message: existing });
          return;
        }
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
          message: "Something went wrong on our side. Try again.",
          retryable: true,
        });
        return;
      }

      let content = "";
      let provider: Provider | undefined;
      let ttftMs: number | undefined;
      let failed = false;

      try {
        for await (const chunk of streamChat(
          providersFromEnv(c.env),
          [{ role: "system", content: systemPrompt(locale) }, ...history],
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
      const status = signal.aborted ? "stopped" : failed ? "error" : "complete";

      const saved = saveAssistantMessage(database, {
        id: assistantMessageId,
        conversationId,
        content,
        status,
        provider: provider?.name ?? null,
        model: provider?.model ?? null,
      });

      if (status === "stopped") {
        c.executionCtx.waitUntil(saved);
      } else {
        const message = await saved;
        await send(
          status === "complete"
            ? { type: "done", message }
            : {
                type: "error",
                message:
                  ttftMs === undefined
                    ? "No model is available right now. Try again in a moment."
                    : "The reply was cut off.",
                retryable: true,
              },
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
          status,
        }),
      );
    });
  },
);
