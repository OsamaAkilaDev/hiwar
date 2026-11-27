import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Me } from "../../shared/events";
import {
  type AppEnv,
  adoptGuest,
  endSession,
  GUEST_MESSAGES,
  guestMessagesUsed,
  hashPassword,
  NOBODY,
  startSession,
  verifyPassword,
} from "../auth";
import { db } from "../db/client";
import { users } from "../db/schema";

const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(200),
  locale: z.enum(["ar", "en"]).default("en"),
});

const Signup = Credentials.extend({ name: z.string().trim().min(1).max(40) });
const Rename = z.object({ name: z.string().trim().min(1).max(40) });

const invalid = { error: "invalid_request" } as const;

const isGuest = (user: { email: string | null }) =>
  user !== NOBODY && !user.email;

export const auth = new Hono<AppEnv>()
  // Same budget as chat, its own bucket: slows password guessing.
  .use("/auth/*", async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const { success } = await c.env.CHAT_LIMITER.limit({ key: `auth:${ip}` });
    return success ? next() : c.json({ error: "rate_limited" }, 429);
  })
  .get("/me", async (c) => {
    const user = c.get("user");
    const used =
      user.email || user === NOBODY
        ? 0
        : await guestMessagesUsed(db(c.env), user.id);
    return c.json<Me>({
      email: user.email,
      name: user.name,
      guestLeft: user.email ? null : Math.max(0, GUEST_MESSAGES - used),
    });
  })
  .patch("/me", async (c) => {
    const user = c.get("user");
    if (!user.email) return c.json({ error: "sign_in_required" }, 403);
    const body = Rename.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json(invalid, 400);
    await db(c.env)
      .update(users)
      .set({ name: body.data.name })
      .where(eq(users.id, user.id));
    return c.body(null, 204);
  })
  .post("/auth/signup", async (c) => {
    const body = Signup.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json(invalid, 400);
    const { email, password, locale, name } = body.data;
    const database = db(c.env);
    const [taken] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (taken) return c.json({ error: "email_taken" }, 409);

    const passwordHash = await hashPassword(password);
    const user = c.get("user");
    let id = user.id;
    // A guest becomes the account, so their chats are already in it.
    if (isGuest(user)) {
      await database
        .update(users)
        .set({ email, passwordHash, name })
        .where(eq(users.id, id));
    } else {
      const [created] = await database
        .insert(users)
        .values({ email, passwordHash, locale, name })
        .returning({ id: users.id });
      if (!created) return c.json({ error: "server" }, 500);
      id = created.id;
    }
    await endSession(c, database);
    await startSession(c, database, id);
    return c.json<Me>({ email, name, guestLeft: null });
  })
  .post("/auth/signin", async (c) => {
    const body = Credentials.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json(invalid, 400);
    const { email, password } = body.data;
    const database = db(c.env);
    const [account] = await database
      .select({
        id: users.id,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email));
    if (
      !account?.passwordHash ||
      !(await verifyPassword(password, account.passwordHash))
    ) {
      return c.json({ error: "invalid_credentials" }, 401);
    }
    const user = c.get("user");
    if (isGuest(user)) await adoptGuest(database, user.id, account.id);
    await endSession(c, database);
    await startSession(c, database, account.id);
    return c.json<Me>({ email, name: account.name, guestLeft: null });
  })
  .post("/auth/signout", async (c) => {
    await endSession(c, db(c.env));
    return c.body(null, 204);
  });
