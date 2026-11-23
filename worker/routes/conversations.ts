import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client";
import { listMessages } from "../db/messages";

const Params = z.object({ id: z.uuid() });
const Query = z.object({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const conversations = new Hono<{ Bindings: Env }>().get(
  "/conversations/:id/messages",
  async (c) => {
    const params = Params.safeParse(c.req.param());
    const query = Query.safeParse(c.req.query());
    if (!params.success || !query.success) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const messages = await listMessages(db(c.env), params.data.id, query.data);
    return c.json({ messages });
  },
);
