import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../auth";
import { db } from "../db/client";
import {
  deleteAllConversations,
  deleteConversation,
  listConversations,
  renameConversation,
} from "../db/conversations";
import { listMessages } from "../db/messages";

const PAGE_SIZE = 50;

const Params = z.object({ id: z.uuid() });
const Query = z.object({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const Rename = z.object({ title: z.string().trim().min(1).max(80) });

const Cursor = z.object({ lastMessageAt: z.iso.datetime(), id: z.uuid() });
type Cursor = z.infer<typeof Cursor>;

const encodeCursor = ({ lastMessageAt, id }: Cursor) =>
  btoa(`${lastMessageAt}|${id}`)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

function decodeCursor(cursor: string): Cursor | null {
  try {
    const [lastMessageAt, id] = atob(
      cursor.replaceAll("-", "+").replaceAll("_", "/"),
    ).split("|");
    const parsed = Cursor.safeParse({ lastMessageAt, id });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const notFound = { error: "not_found" } as const;
const invalid = { error: "invalid_request" } as const;

export const conversations = new Hono<AppEnv>()
  .get("/conversations", async (c) => {
    const cursor = c.req.query("cursor");
    const before = cursor === undefined ? undefined : decodeCursor(cursor);
    if (before === null) return c.json(invalid, 400);
    const rows = await listConversations(db(c.env), c.get("user").id, {
      before,
      limit: PAGE_SIZE + 1,
    });
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);
    return c.json({
      conversations: page,
      nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor(last) : null,
    });
  })
  .get("/conversations/:id/messages", async (c) => {
    const params = Params.safeParse(c.req.param());
    const query = Query.safeParse(c.req.query());
    if (!params.success || !query.success) return c.json(invalid, 400);
    const messages = await listMessages(
      db(c.env),
      c.get("user").id,
      params.data.id,
      query.data,
    );
    return c.json({ messages });
  })
  .patch("/conversations/:id", async (c) => {
    const params = Params.safeParse(c.req.param());
    const body = Rename.safeParse(await c.req.json().catch(() => null));
    if (!params.success || !body.success) return c.json(invalid, 400);
    const { found } = await renameConversation(
      db(c.env),
      c.get("user").id,
      params.data.id,
      body.data.title,
    );
    return found ? c.body(null, 204) : c.json(notFound, 404);
  })
  .delete("/conversations", async (c) => {
    await deleteAllConversations(db(c.env), c.get("user").id);
    return c.body(null, 204);
  })
  .delete("/conversations/:id", async (c) => {
    const params = Params.safeParse(c.req.param());
    if (!params.success) return c.json(invalid, 400);
    const { found } = await deleteConversation(
      db(c.env),
      c.get("user").id,
      params.data.id,
    );
    return found ? c.body(null, 204) : c.json(notFound, 404);
  });
