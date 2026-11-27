import { expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "./client";
import {
  deleteConversation,
  listConversations,
  renameConversation,
} from "./conversations";
import { insertUserMessage, listMessages } from "./messages";
import * as schema from "./schema";
import { SEED_USER_ID } from "./schema";

test.skipIf(!process.env.TEST_DATABASE_URL)(
  "conversations are scoped to their user",
  async () => {
    const db = createDb(process.env.TEST_DATABASE_URL as string);
    const otherUserId = crypto.randomUUID();
    const [older, newer, foreign] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ] as [string, string, string];
    const send = (userId: string, conversationId: string) =>
      insertUserMessage(db, {
        userId,
        conversationId,
        id: crypto.randomUUID(),
        text: "hi",
        lang: "en",
      });
    try {
      await db.insert(schema.users).values({ id: otherUserId, locale: "en" });
      await send(SEED_USER_ID, older);
      await send(SEED_USER_ID, newer);
      await send(otherUserId, foreign);
      await db
        .update(schema.conversations)
        .set({ lastMessageAt: new Date(Date.now() + 1000) })
        .where(eq(schema.conversations.id, newer));

      const list = await listConversations(db, SEED_USER_ID, { limit: 100 });
      const ours = list.filter((c) => [older, newer, foreign].includes(c.id));
      expect(ours.map((c) => c.id)).toEqual([newer, older]);

      expect(await listMessages(db, SEED_USER_ID, foreign)).toEqual([]);
      expect(await send(SEED_USER_ID, foreign)).toEqual({
        found: false,
        inserted: false,
      });
      expect(await listMessages(db, otherUserId, foreign)).toHaveLength(1);

      expect(await renameConversation(db, otherUserId, older, "x")).toEqual({
        found: false,
      });
      expect(
        await renameConversation(db, SEED_USER_ID, older, "Renamed"),
      ).toEqual({ found: true });

      expect(await deleteConversation(db, SEED_USER_ID, foreign)).toEqual({
        found: false,
      });
      expect(await deleteConversation(db, SEED_USER_ID, older)).toEqual({
        found: true,
      });
      expect(await listMessages(db, SEED_USER_ID, older)).toEqual([]);
      const rows = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, older));
      expect(rows).toEqual([]);
    } finally {
      await db
        .delete(schema.conversations)
        .where(inArray(schema.conversations.id, [older, newer, foreign]));
      await db.delete(schema.users).where(eq(schema.users.id, otherUserId));
      await db.$client.end();
    }
  },
  30_000,
);
