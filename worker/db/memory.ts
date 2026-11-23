import {
  and,
  cosineDistance,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import type { DB } from "./client";
import { memories, profileFacts } from "./schema";

export type Fact = Pick<typeof profileFacts.$inferSelect, "key" | "value">;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = Omit<
  typeof memories.$inferInsert,
  "id" | "createdAt" | "lastUsedAt" | "supersededBy"
>;

export const listFacts = (db: DB, userId: string) =>
  db
    .select()
    .from(profileFacts)
    .where(eq(profileFacts.userId, userId))
    .orderBy(profileFacts.key);

export async function upsertFact(
  db: DB,
  userId: string,
  { key, value }: Fact,
  sourceMessageId?: string,
) {
  await db
    .insert(profileFacts)
    .values({ userId, key, value, sourceMessageId })
    .onConflictDoUpdate({
      target: [profileFacts.userId, profileFacts.key],
      set: { value, sourceMessageId, updatedAt: sql`now()` },
    });
}

export async function updateFact(
  db: DB,
  userId: string,
  id: string,
  value: string,
): Promise<{ found: boolean }> {
  const rows = await db
    .update(profileFacts)
    .set({ value, updatedAt: sql`now()` })
    .where(and(eq(profileFacts.id, id), eq(profileFacts.userId, userId)))
    .returning({ id: profileFacts.id });
  return { found: rows.length > 0 };
}

export async function deleteFact(db: DB, userId: string, id: string) {
  await db
    .delete(profileFacts)
    .where(and(eq(profileFacts.id, id), eq(profileFacts.userId, userId)));
}

export const listMemories = (db: DB, userId: string) =>
  db
    .select()
    .from(memories)
    .where(and(eq(memories.userId, userId), isNull(memories.supersededBy)))
    .orderBy(desc(memories.createdAt));

// ponytail: exact scan, no vector index; add HNSW once a user has ~10k memories.
export async function nearestMemories(
  db: DB,
  userId: string,
  vector: number[],
  model: string,
  // ponytail: 0.5 is a starting point, tune it against real queries.
  {
    limit = 5,
    minSimilarity = 0.5,
  }: { limit?: number; minSimilarity?: number } = {},
) {
  const distance = cosineDistance(memories.embedding, vector);
  const similarity = sql<number>`1 - (${distance})`;
  return db
    .select({ id: memories.id, content: memories.content, similarity })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.embeddingModel, model),
        isNull(memories.supersededBy),
        sql`${similarity} >= ${minSimilarity}`,
      ),
    )
    .orderBy(distance)
    .limit(limit);
}

export async function insertMemory(db: DB, memory: NewMemory) {
  const [row] = await db.insert(memories).values(memory).returning();
  if (!row) throw new Error("Failed to insert memory");
  return row;
}

export async function supersedeMemory(
  db: DB,
  userId: string,
  id: string,
  by: string,
) {
  await db
    .update(memories)
    .set({ supersededBy: by })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));
}

export async function deleteMemory(db: DB, userId: string, id: string) {
  await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));
}

export async function forgetAll(db: DB, userId: string) {
  await db.delete(memories).where(eq(memories.userId, userId));
  await db.delete(profileFacts).where(eq(profileFacts.userId, userId));
}

export async function touchMemories(db: DB, ids: string[]) {
  if (ids.length === 0) return;
  await db
    .update(memories)
    .set({ lastUsedAt: sql`now()` })
    .where(inArray(memories.id, ids));
}
