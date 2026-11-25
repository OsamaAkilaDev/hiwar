import type {
  ChatStreamRequest,
  ConversationList,
  MemorySnapshot,
  MessageDTO,
  StreamEvent,
} from "../../shared/events";
import { parseEventStream } from "../../shared/sse";

// Reads give up after 15s, so a stuck request ends in the error screen
// (with retry) instead of a page that never finishes loading.
const READ_TIMEOUT_MS = 15_000;
const timed = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(READ_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

export async function getMessages(
  conversationId: string,
  { before, signal }: { before?: string; signal?: AbortSignal } = {},
): Promise<MessageDTO[]> {
  const query = before ? `?before=${before}` : "";
  const res = await fetch(
    `/api/conversations/${conversationId}/messages${query}`,
    { signal: timed(signal) },
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

export async function listConversations(
  cursor?: string,
  signal?: AbortSignal,
): Promise<ConversationList> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const res = await fetch(`/api/conversations${query}`, {
    signal: timed(signal),
  });
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

export async function renameConversation(id: string, title: string) {
  const res = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new HttpError(res.status);
}

export async function deleteAllConversations() {
  const res = await fetch("/api/conversations", { method: "DELETE" });
  if (!res.ok) throw new HttpError(res.status);
}

export async function deleteConversation(id: string) {
  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new HttpError(res.status);
}

export async function getMemory(signal?: AbortSignal): Promise<MemorySnapshot> {
  const res = await fetch("/api/memory", { signal: timed(signal) });
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

export async function updateFact(id: string, value: string) {
  const res = await fetch(`/api/memory/facts/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new HttpError(res.status);
}

const remove = async (path: string) => {
  const res = await fetch(`/api/memory${path}`, { method: "DELETE" });
  if (!res.ok) throw new HttpError(res.status);
};
export const deleteFact = (id: string) => remove(`/facts/${id}`);
export const deleteMemory = (id: string) => remove(`/memories/${id}`);
export const forgetAll = () => remove("");
