import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import { insertUserMessage, listMessages } from "./messages";
import * as schema from "./schema";

test.skipIf(!process.env.DATABASE_URL)(
  "insertUserMessage twice with the same id stores one row",
  async () => {
    const db = createDb(process.env.DATABASE_URL as string);
    const conversationId = crypto.randomUUID();
    const input = {
      conversationId,
      id: crypto.randomUUID(),
      text: "hi",
      lang: "en",
    };
    try {
      expect(await insertUserMessage(db, input)).toEqual({ inserted: true });
      expect(await insertUserMessage(db, input)).toEqual({ inserted: false });
      expect(await listMessages(db, conversationId)).toHaveLength(1);
    } finally {
      await db
        .delete(schema.conversations)
        .where(eq(schema.conversations.id, conversationId));
      await db.$client.end();
    }
  },
  15_000,
);
