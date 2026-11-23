import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { HttpError, streamChat } from "../../../lib/api";
import { newId } from "../../../lib/ids";
import { queryKeys } from "../../../lib/query-keys";
import { useChatStore } from "../store";
import { createFrameFlusher } from "../stream/frame-flush";

const assistantRow = (conversationId: string): MessageDTO => ({
  id: newId(),
  conversationId,
  role: "assistant",
  content: "",
  status: "streaming",
  createdAt: new Date().toISOString(),
});

const interrupted = (
  signal: AbortSignal,
  cause?: unknown,
): Partial<MessageDTO> => {
  if (signal.aborted) return { status: "stopped" };
  const error =
    cause instanceof HttpError && cause.status === 429
      ? "Too many messages. Wait a minute and try again."
      : "Connection lost.";
  return { status: "error", error, retryable: true };
};

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.messages(conversationId);
  const controller = useRef<AbortController | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const setRows = (update: (rows: MessageDTO[]) => MessageDTO[]) =>
    queryClient.setQueryData<MessageDTO[]>(key, (rows) => update(rows ?? []));

  const run = async (user: MessageDTO, assistant: MessageDTO) => {
    const { append, clear } = useChatStore.getState();
    const abort = new AbortController();
    controller.current = abort;
    setStreamingId(assistant.id);
    const flusher = createFrameFlusher(append);

    const settle = (patch: Partial<MessageDTO>) => {
      flusher.flushNow();
      const text = useChatStore.getState().streams[assistant.id]?.text ?? "";
      setRows((rows) =>
        rows.map((row) =>
          row.id === assistant.id ? { ...row, content: text, ...patch } : row,
        ),
      );
      clear(assistant.id);
    };

    try {
      const events = streamChat(
        {
          conversationId,
          userMessageId: user.id,
          assistantMessageId: assistant.id,
          text: user.content,
          locale: document.documentElement.lang === "ar" ? "ar" : "en",
        },
        abort.signal,
      );
      let ended = false;
      for await (const event of events) {
        if (event.type === "delta") flusher.push(assistant.id, event.text);
        else if (event.type === "done") {
          settle(event.message);
          ended = true;
        } else if (event.type === "error") {
          settle({
            status: "error",
            error: event.message,
            retryable: event.retryable,
          });
          ended = true;
        }
      }
      if (!ended) settle(interrupted(abort.signal));
    } catch (cause) {
      settle(interrupted(abort.signal, cause));
    } finally {
      controller.current = null;
      setStreamingId(null);
    }
  };

  const start = async (
    user: MessageDTO,
    assistant: MessageDTO,
    rows: (rows: MessageDTO[]) => MessageDTO[],
  ) => {
    await queryClient.cancelQueries({ queryKey: key });
    setRows(rows);
    await run(user, assistant);
  };

  return {
    streamingId,
    isStreaming: streamingId !== null,
    send(text: string) {
      if (controller.current) return;
      const user: MessageDTO = {
        id: newId(),
        conversationId,
        role: "user",
        content: text,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      const assistant = assistantRow(conversationId);
      void start(user, assistant, (rows) => [...rows, user, assistant]);
    },
    retry(userMessageId: string) {
      if (controller.current) return;
      const rows = queryClient.getQueryData<MessageDTO[]>(key) ?? [];
      const user = rows.find((r) => r.id === userMessageId);
      if (user?.role !== "user") return;
      const assistant = assistantRow(conversationId);
      void start(user, assistant, (current) => {
        const at = current.findIndex((r) => r.id === userMessageId) + 1;
        const next = current[at]?.role === "assistant" ? at + 1 : at;
        return [...current.slice(0, at), assistant, ...current.slice(next)];
      });
    },
    stop() {
      controller.current?.abort();
    },
  };
}
