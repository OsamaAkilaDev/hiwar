import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client";
import {
  deleteFact,
  deleteMemory,
  forgetAll,
  listFacts,
  listMemories,
  updateFact,
} from "../db/memory";
import { SEED_USER_ID } from "../db/schema";

const Params = z.object({ id: z.uuid() });
const Edit = z.object({ value: z.string().trim().min(1).max(200) });

const notFound = { error: "not_found" } as const;
const invalid = { error: "invalid_request" } as const;

export const memory = new Hono<{ Bindings: Env }>()
  .get("/memory", async (c) => {
    const [facts, memories] = await Promise.all([
      listFacts(db(c.env), SEED_USER_ID),
      listMemories(db(c.env), SEED_USER_ID),
    ]);
    return c.json({
      facts: facts.map((f) => ({
        id: f.id,
        key: f.key,
        value: f.value,
        updatedAt: f.updatedAt.toISOString(),
      })),
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        lang: m.lang,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  })
  .patch("/memory/facts/:id", async (c) => {
    const params = Params.safeParse(c.req.param());
    const body = Edit.safeParse(await c.req.json().catch(() => null));
    if (!params.success || !body.success) return c.json(invalid, 400);
    const { found } = await updateFact(
      db(c.env),
      SEED_USER_ID,
      params.data.id,
      body.data.value,
    );
    return found ? c.body(null, 204) : c.json(notFound, 404);
  })
  .delete("/memory/facts/:id", async (c) => {
    const params = Params.safeParse(c.req.param());
    if (!params.success) return c.json(invalid, 400);
    await deleteFact(db(c.env), SEED_USER_ID, params.data.id);
    return c.body(null, 204);
  })
  .delete("/memory/memories/:id", async (c) => {
    const params = Params.safeParse(c.req.param());
    if (!params.success) return c.json(invalid, 400);
    await deleteMemory(db(c.env), SEED_USER_ID, params.data.id);
    return c.body(null, 204);
  })
  .delete("/memory", async (c) => {
    await forgetAll(db(c.env), SEED_USER_ID);
    return c.body(null, 204);
  });
