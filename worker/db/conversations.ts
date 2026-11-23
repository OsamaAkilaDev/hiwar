import { and, desc, eq, sql } from "drizzle-orm";
import type { ConversationDTO } from "../../shared/events";
import type { DB } from "./client";
import { conversations } from "./schema";

type Row = typeof conversations.$inferSelect;

const toDTO = (row: Row): ConversationDTO => ({
  id: row.id,
  title: row.title,
  lastMessageAt: row.lastMessageAt.toISOString(),
});

// Timestamps are stored at millisecond precision (matching JS dates), so the
// cursor compares exactly and the (user_id, last_message_at) index serves the sort.
const sortKey = conversations.lastMessageAt;

export async function listConversations(
  db: DB,
  userId: string,
  {
    before,
    limit = 50,
  }: { before?: { lastMessageAt: string; id: string }; limit?: number } = {},
): Promise<ConversationDTO[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        before &&
          sql`(${sortKey}, ${conversations.id}) < (${before.lastMessageAt}::timestamptz, ${before.id}::uuid)`,
      ),
    )
    .orderBy(desc(sortKey), desc(conversations.id))
    .limit(limit);
  return rows.map(toDTO);
}

export async function getConversation(
  db: DB,
  userId: string,
  id: string,
): Promise<ConversationDTO | undefined> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row && toDTO(row);
}

export async function renameConversation(
  db: DB,
  userId: string,
  id: string,
  title: string,
): Promise<{ found: boolean }> {
  const rows = await db
    .update(conversations)
    .set({ title })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  return { found: rows.length > 0 };
}

export async function deleteConversation(
  db: DB,
  userId: string,
  id: string,
): Promise<{ found: boolean }> {
  const rows = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  return { found: rows.length > 0 };
}

export async function deleteAllConversations(db: DB, userId: string) {
  await db.delete(conversations).where(eq(conversations.userId, userId));
}

export const setConversationTitle = renameConversation;

export async function getMemoryCursor(
  db: DB,
  userId: string,
  id: string,
): Promise<string | null> {
  const [row] = await db
    .select({ cursor: conversations.memoryCursor })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row?.cursor ?? null;
}

export async function setMemoryCursor(
  db: DB,
  userId: string,
  id: string,
  cursor: string,
) {
  await db
    .update(conversations)
    .set({ memoryCursor: cursor })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}
