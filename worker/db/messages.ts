import { and, desc, eq, exists, lt, sql } from "drizzle-orm";
import type { ErrorCode, MessageDTO } from "../../shared/events";
import type { DB } from "./client";
import { conversations, messages } from "./schema";

type Row = typeof messages.$inferSelect;

type ErrorPart = { type: "error"; code?: ErrorCode; retryable: boolean };

const errorPart = (parts: unknown) =>
  (parts as { type?: string }[]).find(
    (p): p is ErrorPart => p.type === "error",
  );

const ownedBy = (db: DB, userId: string) =>
  exists(
    db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, messages.conversationId),
          eq(conversations.userId, userId),
        ),
      ),
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
    provider: row.provider,
    model: row.model,
    ...(failure && { error: failure.code, retryable: failure.retryable }),
  };
};

// One statement (one round trip): upsert the conversation, insert the message.
// `found` is false when the conversation exists but belongs to someone else.
export async function insertUserMessage(
  db: DB,
  input: {
    userId: string;
    conversationId: string;
    id: string;
    text: string;
    lang: string;
  },
): Promise<{ found: boolean; inserted: boolean }> {
  const { userId, conversationId, id, text, lang } = input;
  const { rows } = await db.execute<{ found: number; inserted: number }>(sql`
    with created as (
      insert into ${conversations} (id, user_id)
      values (${conversationId}, ${userId})
      on conflict do nothing
      returning id
    ),
    owned as (
      select id from created
      union all
      select id from ${conversations}
      where id = ${conversationId} and user_id = ${userId}
    ),
    message as (
      insert into ${messages} (id, conversation_id, role, content, status, lang)
      select ${id}, id, 'user', ${text}, 'complete', ${lang} from owned
      on conflict do nothing
      returning id
    )
    select
      (select count(*) from owned)::int as found,
      (select count(*) from message)::int as inserted
  `);
  return { found: rows[0]?.found === 1, inserted: rows[0]?.inserted === 1 };
}

export async function recentMessages(
  db: DB,
  userId: string,
  conversationId: string,
  limit = 20,
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.conversationId, conversationId), ownedBy(db, userId)),
    )
    .orderBy(desc(messages.id))
    .limit(limit);
  return rows.reverse().map(toDTO);
}

export async function listMessages(
  db: DB,
  userId: string,
  conversationId: string,
  { before, limit = 50 }: { before?: string; limit?: number } = {},
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ownedBy(db, userId),
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
  userId: string,
  id: string,
): Promise<MessageDTO | undefined> {
  const [row] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), ownedBy(db, userId)));
  return row && toDTO(row);
}
