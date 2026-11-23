import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { ErrorCode, MessageDTO } from "../../shared/events";
import type { DB } from "./client";
import { conversations, messages, SEED_USER_ID } from "./schema";

type Row = typeof messages.$inferSelect;

type ErrorPart = { type: "error"; code?: ErrorCode; retryable: boolean };

const errorPart = (parts: unknown) =>
  (parts as { type?: string }[]).find(
    (p): p is ErrorPart => p.type === "error",
  );

const toDTO = (row: Row): MessageDTO => {
  const failure = errorPart(row.parts);
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    ...(failure && { error: failure.code, retryable: failure.retryable }),
  };
};

// One statement (one round trip): upsert the conversation, insert the message.
export async function insertUserMessage(
  db: DB,
  input: {
    conversationId: string;
    id: string;
    text: string;
    lang: string;
    userId?: string;
  },
): Promise<{ inserted: boolean }> {
  const { conversationId, id, text, lang, userId = SEED_USER_ID } = input;
  const rows = await db.execute(sql`
    with conversation as (
      insert into ${conversations} (id, user_id)
      values (${conversationId}, ${userId})
      on conflict do nothing
    )
    insert into ${messages} (id, conversation_id, role, content, status, lang)
    values (${id}, ${conversationId}, 'user', ${text}, 'complete', ${lang})
    on conflict do nothing
    returning id
  `);
  return { inserted: rows.rowCount === 1 };
}

export async function recentMessages(
  db: DB,
  conversationId: string,
  limit = 20,
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.id))
    .limit(limit);
  return rows.reverse().map(toDTO);
}

export async function listMessages(
  db: DB,
  conversationId: string,
  { before, limit = 50 }: { before?: string; limit?: number } = {},
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        before ? lt(messages.id, before) : undefined,
      ),
    )
    .orderBy(desc(messages.id))
    .limit(limit);
  return rows.reverse().map(toDTO);
}

export async function saveAssistantMessage(
  db: DB,
  {
    error,
    ...input
  }: Pick<
    Row,
    "id" | "conversationId" | "content" | "status" | "provider" | "model"
  > & { error?: { code: ErrorCode; retryable: boolean } },
): Promise<MessageDTO> {
  const parts = error ? [{ type: "error", ...error }] : [];
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({ ...input, parts, role: "assistant" })
      .returning();
    if (!row) throw new Error("Failed to save assistant message");
    await tx
      .update(conversations)
      .set({ lastMessageAt: row.createdAt })
      .where(eq(conversations.id, input.conversationId));
    return toDTO(row);
  });
}

export async function getMessage(
  db: DB,
  id: string,
): Promise<MessageDTO | undefined> {
  const [row] = await db.select().from(messages).where(eq(messages.id, id));
  return row && toDTO(row);
}
