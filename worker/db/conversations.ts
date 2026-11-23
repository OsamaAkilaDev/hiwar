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

// JS dates carry milliseconds and Postgres microseconds, so keyset paging
// compares and orders on the truncated value to match the cursor exactly.
const sortKey = sql`date_trunc('milliseconds', ${conversations.lastMessageAt})`;

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

export const setConversationTitle = renameConversation;
