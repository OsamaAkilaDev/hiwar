import { and, desc, eq, lt } from "drizzle-orm";
import type { MessageDTO } from "../../shared/events";
import type { DB } from "./client";
import { conversations, messages, SEED_USER_ID } from "./schema";

type Row = typeof messages.$inferSelect;

const toDTO = (row: Row): MessageDTO => ({
  id: row.id,
  conversationId: row.conversationId,
  role: row.role,
  content: row.content,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

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
  return db.transaction(async (tx) => {
    await tx
      .insert(conversations)
      .values({ id: conversationId, userId })
      .onConflictDoNothing();
    const rows = await tx
      .insert(messages)
      .values({
        id,
        conversationId,
        role: "user",
        content: text,
        status: "complete",
        lang,
      })
      .onConflictDoNothing()
      .returning({ id: messages.id });
    return { inserted: rows.length > 0 };
  });
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
  input: Pick<
    Row,
    "id" | "conversationId" | "content" | "status" | "provider" | "model"
  >,
): Promise<MessageDTO> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({ ...input, role: "assistant" })
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
