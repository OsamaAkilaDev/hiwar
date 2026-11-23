import type { DB } from "../db/client";
import {
  type Fact,
  listFacts,
  nearestMemories,
  touchMemories,
} from "../db/memory";
import { EMBEDDING_MODEL, embed } from "./embed";

const GREETING =
  /^(hi|hello|hey|thanks|thank you|good (morning|evening|night)|مرحبا|مرحبًا|اهلا|أهلا|هلا|السلام عليكم|شكرا|شكرًا)[\s!.,?؟،]*$/i;

export const isTrivial = (text: string) => {
  const trimmed = text.trim();
  return trimmed.length < 12 || GREETING.test(trimmed);
};

export type Context = {
  facts: Fact[];
  memories: { id: string; content: string }[];
};

const retrieve = async (db: DB, env: Env, userId: string, text: string) => {
  if (isTrivial(text)) return [];
  try {
    const [vector] = await embed(env, [text]);
    return vector
      ? await nearestMemories(db, userId, vector, EMBEDDING_MODEL)
      : [];
  } catch (error) {
    console.error("memory.retrieve failed", error);
    return [];
  }
};

export async function contextFor(
  db: DB,
  env: Env,
  userId: string,
  text: string,
): Promise<Context> {
  const [facts, memories] = await Promise.all([
    listFacts(db, userId),
    retrieve(db, env, userId, text),
  ]);
  return { facts, memories };
}

export const touch = (db: DB, ids: string[]) =>
  touchMemories(db, ids).catch((error) =>
    console.error("memory.touch failed", error),
  );
