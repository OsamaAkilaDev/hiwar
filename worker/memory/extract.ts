import { z } from "zod";
import { langOf } from "../../shared/lang";
import type { DB } from "../db/client";
import { getMemoryCursor, setMemoryCursor } from "../db/conversations";
import {
  insertMemory,
  nearestMemories,
  supersedeMemory,
  upsertFact,
} from "../db/memory";
import { userMessagesAfter } from "../db/messages";
import { streamChat } from "../llm/gateway";
import { extractPrompt } from "../llm/prompts/extract-memory";
import type { Provider } from "../llm/types";
import { EMBEDDING_MODEL, embed } from "./embed";

const MIN_MESSAGES = 3;
const TIMEOUT_MS = 20_000;

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .pipe(z.string().min(1));
const list = <T extends z.ZodType>(item: T) =>
  z.array(item).transform((items) => items.slice(0, 10));

const Extraction = z.object({
  facts: list(z.object({ key: text(40), value: text(200) })),
  memories: list(
    z.object({
      content: text(300),
      importance: z
        .number()
        .default(0.5)
        .transform((n) => Math.min(1, Math.max(0, n))),
    }),
  ),
});
export type Extraction = z.infer<typeof Extraction>;

export function parseExtraction(raw: string): Extraction {
  const json = raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? raw;
  try {
    const parsed = Extraction.safeParse(JSON.parse(json));
    if (parsed.success) return parsed.data;
  } catch {}
  return { facts: [], memories: [] };
}

// ponytail: similarity thresholds are a heuristic; use an LLM judge if it misfires.
export const decide = (similarity: number) =>
  similarity >= 0.92
    ? "duplicate"
    : similarity >= 0.85
      ? "supersede"
      : "insert";

async function extract(providers: Provider[], messages: string[]) {
  let raw = "";
  for await (const chunk of streamChat(
    providers,
    [
      { role: "system", content: extractPrompt() },
      { role: "user", content: messages.join("\n\n") },
    ],
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )) {
    raw += chunk.text;
  }
  return parseExtraction(raw);
}

export async function extractMemories(
  db: DB,
  env: Env,
  providers: Provider[],
  userId: string,
  conversationId: string,
) {
  const startedAt = Date.now();
  const stats = { facts: 0, inserted: 0, superseded: 0, duplicates: 0 };
  let ok = false;
  try {
    const pending = await userMessagesAfter(
      db,
      userId,
      conversationId,
      await getMemoryCursor(db, userId, conversationId),
    );
    const newest = pending.at(-1);
    if (!newest || pending.length < MIN_MESSAGES) return;

    const { facts, memories } = await extract(
      providers,
      pending.map((m) => m.content),
    );
    for (const fact of facts) {
      await upsertFact(db, userId, fact, newest.id);
    }
    stats.facts = facts.length;

    const vectors = memories.length
      ? await embed(
          env,
          memories.map((m) => m.content),
        )
      : [];
    for (const [i, memory] of memories.entries()) {
      const embedding = vectors[i];
      if (!embedding) continue;
      const [near] = await nearestMemories(
        db,
        userId,
        embedding,
        EMBEDDING_MODEL,
        { limit: 1, minSimilarity: 0 },
      );
      const action = near ? decide(near.similarity) : "insert";
      if (action === "duplicate") {
        stats.duplicates++;
        continue;
      }
      const created = await insertMemory(db, {
        userId,
        content: memory.content,
        embedding,
        embeddingModel: EMBEDDING_MODEL,
        lang: langOf(memory.content),
        sourceConversationId: conversationId,
        importance: memory.importance,
      });
      stats.inserted++;
      if (near && action === "supersede") {
        await supersedeMemory(db, userId, near.id, created.id);
        stats.superseded++;
      }
    }
    await setMemoryCursor(db, userId, conversationId, newest.id);
    ok = true;
  } catch (error) {
    console.error("chat.memory failed", error);
  }
  console.log(
    JSON.stringify({
      route: "chat.memory",
      ...stats,
      ms: Date.now() - startedAt,
      ok,
    }),
  );
}
