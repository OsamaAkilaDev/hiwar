import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { HttpError, streamChat } from "../../../lib/api";
import { newId } from "../../../lib/ids";
import { usePrefs } from "../../../lib/prefs";
import { queryKeys } from "../../../lib/query-keys";
import { type ConversationsData, patch, upsertTop } from "../../sidebar/cache";
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
      ? "rate_limited"
      : "connection";
  return { status: "error", error, retryable: true };
};

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.messages(conversationId);
  const listKey = queryKeys.conversations();
  const controller = useRef<AbortController | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const setRows = (update: (rows: MessageDTO[]) => MessageDTO[]) =>
    queryClient.setQueryData<MessageDTO[]>(key, (rows) => update(rows ?? []));

  const updateList = (update: (data: ConversationsData) => ConversationsData) =>
    queryClient.setQueryData<ConversationsData>(
      listKey,
      (data) => data && update(data),
    );

  const run = async (user: MessageDTO, assistant: MessageDTO) => {
    const { append, replace, clear, searching, cite } = useChatStore.getState();
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
      // The query cache notifies on the next task; clearing the live text now
      // would blank the reply for a frame (and unpin the scroll).
      setTimeout(() => clear(assistant.id));
    };

    try {
      const events = streamChat(
        {
          conversationId,
          userMessageId: user.id,
          assistantMessageId: assistant.id,
          text: user.content,
          locale: usePrefs.getState().locale,
          memory: usePrefs.getState().memory,
          model: usePrefs.getState().model,
        },
        abort.signal,
      );
      let ended = false;
      for await (const event of events) {
        if (event.type === "delta") flusher.push(assistant.id, event.text);
        else if (event.type === "reset") {
          flusher.flushNow();
          replace(assistant.id, event.text);
        } else if (event.type === "tool_start") {
          flusher.flushNow();
          searching(assistant.id, event.query);
        } else if (event.type === "tool_result")
          cite(assistant.id, event.citations);
        else if (event.type === "title")
          updateList((data) =>
            patch(data, conversationId, { title: event.title }),
          );
        else if (event.type === "done") {
          settle(event.message);
          ended = true;
        } else if (event.type === "error") {
          settle({
            status: "error",
            error: event.code,
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
      void queryClient.invalidateQueries({ queryKey: listKey });
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
    updateList((data) =>
      upsertTop(data, {
        id: conversationId,
        title:
          data.pages
            .flatMap((page) => page.conversations)
            .find((c) => c.id === conversationId)?.title ?? null,
        lastMessageAt: new Date().toISOString(),
      }),
    );
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
