import { z } from "zod";

export const ChatStreamRequest = z.object({
  conversationId: z.uuid(),
  userMessageId: z.uuid(),
  assistantMessageId: z.uuid(),
  text: z.string().min(1).max(8000),
  locale: z.enum(["ar", "en"]),
  memory: z.boolean().default(true),
  /** Provider to try first; the rest stay as fallback. */
  model: z.enum(["gemini", "groq"]).optional(),
});
export type ChatStreamRequest = z.input<typeof ChatStreamRequest>;

export const ErrorCode = z.enum([
  "unavailable",
  "cut_off",
  "server",
  "connection",
  "rate_limited",
  "sign_in_required",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const MessageDTO = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  status: z.enum(["streaming", "complete", "stopped", "error"]),
  createdAt: z.string(),
  error: ErrorCode.optional(),
  retryable: z.boolean().optional(),
  provider: z.string().nullish(),
  model: z.string().nullish(),
  citations: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .optional(),
  /** Client only, not stored: the picked provider, when it was busy and
   * another one answered. */
  fallbackFrom: z.enum(["gemini", "groq"]).optional(),
});
export type MessageDTO = z.infer<typeof MessageDTO>;

/** The current visitor: an account (email) or a guest with messages left. */
export type Me = {
  email: string | null;
  name: string | null;
  guestLeft: number | null;
};

export const ConversationDTO = z.object({
  id: z.string(),
  title: z.string().nullable(),
  lastMessageAt: z.string(),
});
export type ConversationDTO = z.infer<typeof ConversationDTO>;

export const ConversationList = z.object({
  conversations: z.array(ConversationDTO),
  nextCursor: z.string().nullable(),
});
export type ConversationList = z.infer<typeof ConversationList>;

export const FactDTO = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});
export type FactDTO = z.infer<typeof FactDTO>;

export const MemoryDTO = z.object({
  id: z.string(),
  content: z.string(),
  lang: z.string(),
  createdAt: z.string(),
});
export type MemoryDTO = z.infer<typeof MemoryDTO>;

export const MemorySnapshot = z.object({
  facts: z.array(FactDTO),
  memories: z.array(MemoryDTO),
});
export type MemorySnapshot = z.infer<typeof MemorySnapshot>;

const base = { messageId: z.string(), seq: z.number() };

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("start") }),
  z.object({ ...base, type: z.literal("delta"), text: z.string() }),
  // A retry replaced the reply so far: `text` is what stays.
  z.object({ ...base, type: z.literal("reset"), text: z.string() }),
  z.object({
    ...base,
    type: z.literal("tool_start"),
    name: z.string(),
    query: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal("tool_result"),
    citations: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
  z.object({ ...base, type: z.literal("title"), title: z.string() }),
  z.object({ ...base, type: z.literal("done"), message: MessageDTO }),
  z.object({
    ...base,
    type: z.literal("error"),
    code: ErrorCode,
    retryable: z.boolean(),
  }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
