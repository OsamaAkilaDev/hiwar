import { z } from "zod";

export const ChatStreamRequest = z.object({
  conversationId: z.uuid(),
  userMessageId: z.uuid(),
  assistantMessageId: z.uuid(),
  text: z.string().min(1).max(8000),
  locale: z.enum(["ar", "en"]),
});
export type ChatStreamRequest = z.infer<typeof ChatStreamRequest>;

export const MessageDTO = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  status: z.enum(["streaming", "complete", "stopped", "error"]),
  createdAt: z.string(),
});
export type MessageDTO = z.infer<typeof MessageDTO>;

const base = { messageId: z.string(), seq: z.number() };

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("start") }),
  z.object({ ...base, type: z.literal("delta"), text: z.string() }),
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
    message: z.string(),
    retryable: z.boolean(),
  }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
