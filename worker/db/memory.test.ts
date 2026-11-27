import { expect, test } from "bun:test";
import { createDb } from "./client";
import {
  forgetAll,
  insertMemory,
  nearestMemories,
  supersedeMemory,
} from "./memory";
import { SEED_USER_ID, users } from "./schema";

const MODEL = "test-model";
const vector = (...head: number[]) =>
  head.concat(Array(1024 - head.length).fill(0));

test.skipIf(!process.env.TEST_DATABASE_URL)(
  "nearestMemories ranks by similarity, skips superseded and other users",
  async () => {
    const db = createDb(process.env.TEST_DATABASE_URL as string);
    const [other] = await db
      .insert(users)
      .values({ locale: "en" })
      .returning({ id: users.id });
    const otherId = other?.id as string;
    const memory = (userId: string, content: string, embedding: number[]) =>
      insertMemory(db, {
        userId,
        content,
        embedding,
        embeddingModel: MODEL,
        lang: "en",
        importance: 0.5,
      });
    try {
      const near = await memory(SEED_USER_ID, "near", vector(1, 0.1));
      await memory(SEED_USER_ID, "far", vector(1, 1));
      const old = await memory(SEED_USER_ID, "old", vector(1, 0));
      await memory(otherId, "theirs", vector(1, 0));
      await supersedeMemory(db, SEED_USER_ID, old.id, near.id);

      const found = await nearestMemories(
        db,
        SEED_USER_ID,
        vector(1, 0),
        MODEL,
        { minSimilarity: 0.5 },
      );
      expect(found.map((m) => m.content)).toEqual(["near", "far"]);
      expect(found[0]?.similarity).toBeGreaterThan(0.99);
    } finally {
      await forgetAll(db, SEED_USER_ID);
      await forgetAll(db, otherId);
      await db.$client.query("delete from users where id = $1", [otherId]);
      await db.$client.end();
    }
  },
  15_000,
);
