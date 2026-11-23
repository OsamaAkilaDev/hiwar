import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { streamChat } from "../../../lib/api";
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

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.messages(conversationId);
  const controller = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => () => controller.current?.abort(), []);

  const setRows = (update: (rows: MessageDTO[]) => MessageDTO[]) =>
    queryClient.setQueryData<MessageDTO[]>(key, (rows) => update(rows ?? []));

  const run = async (user: MessageDTO, assistant: MessageDTO) => {
    const { append, clear } = useChatStore.getState();
    const abort = new AbortController();
    controller.current = abort;
    setIsStreaming(true);
    const flusher = createFrameFlusher(append);

    const settle = (patch: Partial<MessageDTO> | MessageDTO) => {
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
          locale: /[؀-ۿ]/.test(user.content) ? "ar" : "en",
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
          settle({ status: "error" });
          ended = true;
        }
      }
      if (!ended) settle({ status: "error" });
    } catch {
      settle({ status: abort.signal.aborted ? "stopped" : "error" });
    } finally {
      controller.current = null;
      setIsStreaming(false);
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
    isStreaming,
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
    retry(assistantMessageId: string) {
      if (controller.current) return;
      const rows = queryClient.getQueryData<MessageDTO[]>(key) ?? [];
      const user = rows[rows.findIndex((r) => r.id === assistantMessageId) - 1];
      if (user?.role !== "user") return;
      const assistant = assistantRow(conversationId);
      void start(user, assistant, (current) => [
        ...current.filter((row) => row.id !== assistantMessageId),
        assistant,
      ]);
    },
    stop() {
      controller.current?.abort();
    },
  };
}
