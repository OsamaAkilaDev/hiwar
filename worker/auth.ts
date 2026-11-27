// Email + password accounts on top of guest users. A session is an opaque
// cookie token; the DB keeps only its SHA-256.
import { and, count, eq, gt, ne, sql } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { type DB, db } from "./db/client";
import {
  conversations,
  memories,
  messages,
  profileFacts,
  sessions,
  users,
} from "./db/schema";

export type User = { id: string; email: string | null; name: string | null };
export type AppEnv = { Bindings: Env; Variables: { user: User } };

// A visitor without a session reads as this id. It owns no rows, so reads
// come back empty and writes do nothing until a guest is created.
export const NOBODY: User = {
  id: "00000000-0000-4000-8000-000000000000",
  email: null,
  name: null,
};
export const GUEST_MESSAGES = 3;

const COOKIE = "hiwar_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ITERATIONS = 100_000; // the most PBKDF2 iterations Workers allow

const encoder = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      256,
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, iterations, salt, hash] = stored.split("$");
  if (!iterations || !salt || !hash) return false;
  const actual = await pbkdf2(password, unb64(salt), Number(iterations));
  const expected = unb64(hash);
  // Constant time: the loop never exits early on a mismatch.
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  return diff === 0;
}

const sha256 = async (token: string) =>
  b64(await crypto.subtle.digest("SHA-256", encoder.encode(token)));

export async function startSession(
  c: Context<AppEnv>,
  database: DB,
  userId: string,
) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await database
    .insert(sessions)
    .values({ id: await sha256(token), userId, expiresAt });
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(c: Context<AppEnv>, database: DB) {
  const token = getCookie(c, COOKIE);
  if (token) {
    await database.delete(sessions).where(eq(sessions.id, await sha256(token)));
  }
  deleteCookie(c, COOKIE, { path: "/", secure: true });
}

export const session = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, COOKIE);
  let user = NOBODY;
  if (token) {
    const [row] = await db(c.env)
      .select({ id: users.id, email: users.email, name: users.name })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, await sha256(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      );
    if (row) user = row;
  }
  c.set("user", user);
  await next();
});

/** The signed-in user or guest; a first-time visitor becomes a guest. */
export async function ensureUser(
  c: Context<AppEnv>,
  database: DB,
  locale: string,
): Promise<User> {
  const user = c.get("user");
  if (user !== NOBODY) return user;
  const [guest] = await database
    .insert(users)
    .values({ locale })
    .returning({ id: users.id, email: users.email, name: users.name });
  if (!guest) throw new Error("guest insert returned nothing");
  await startSession(c, database, guest.id);
  c.set("user", guest);
  return guest;
}

// ponytail: counts live messages, so deleting chats (or clearing cookies)
// buys a guest more; a per-user counter column if that gets abused.
export async function guestMessagesUsed(
  database: DB,
  userId: string,
  exceptMessageId?: string,
) {
  const [row] = await database
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(messages.role, "user"),
        exceptMessageId ? ne(messages.id, exceptMessageId) : undefined,
      ),
    );
  return row?.n ?? 0;
}

/** Moves a guest's chats and memory into an account, then drops the guest. */
export async function adoptGuest(
  database: DB,
  guestId: string,
  userId: string,
) {
  await database.transaction(async (tx) => {
    await tx
      .update(conversations)
      .set({ userId })
      .where(eq(conversations.userId, guestId));
    await tx
      .update(memories)
      .set({ userId })
      .where(eq(memories.userId, guestId));
    // The account's own facts win over the guest's.
    await tx.execute(
      sql`update profile_facts set user_id = ${userId} where user_id = ${guestId}
          and key not in (select key from profile_facts where user_id = ${userId})`,
    );
    await tx.delete(profileFacts).where(eq(profileFacts.userId, guestId));
    await tx.delete(users).where(eq(users.id, guestId));
  });
}
