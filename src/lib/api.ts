import type {
  ChatStreamRequest,
  MessageDTO,
  StreamEvent,
} from "../../shared/events";
import { parseEventStream } from "../../shared/sse";

export async function getMessages(
  conversationId: string,
  { before, signal }: { before?: string; signal?: AbortSignal } = {},
): Promise<MessageDTO[]> {
  const query = before ? `?before=${before}` : "";
  const res = await fetch(
    `/api/conversations/${conversationId}/messages${query}`,
    { signal },
  );
  if (!res.ok) throw new Error(`messages request failed: ${res.status}`);
  return ((await res.json()) as { messages: MessageDTO[] }).messages;
}

export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`request failed: ${status}`);
  }
}

export async function* streamChat(
  req: ChatStreamRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) throw new HttpError(res.status);
  yield* parseEventStream(res.body);
}
