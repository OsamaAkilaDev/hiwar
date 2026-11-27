import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const SEED_USER_ID = "00000000-0000-4000-8000-000000000001";

export const messageRole = pgEnum("message_role", ["user", "assistant"]);
export const messageStatus = pgEnum("message_status", [
  "streaming",
  "complete",
  "stopped",
  "error",
]);

const createdAt = () =>
  timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow();

// A user without an email is a guest: a few messages, then sign up.
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  locale: text().notNull(),
  email: text().unique(),
  name: text(),
  passwordHash: text(),
  createdAt: createdAt(),
});

// The id is the SHA-256 of the cookie token, so a leaked table can't sign in.
export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    title: text(),
    memoryCursor: uuid(),
    lastMessageAt: timestamp({ withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.lastMessageAt.desc())],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole().notNull(),
    content: text().notNull(),
    parts: jsonb().notNull().default([]),
    status: messageStatus().notNull(),
    provider: text(),
    model: text(),
    lang: text(),
    tokenCount: integer(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.conversationId, t.id)],
);

export const profileFacts = pgTable(
  "profile_facts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    key: text().notNull(),
    value: text().notNull(),
    sourceMessageId: uuid(),
    updatedAt: timestamp({ withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("profile_facts_user_id_key_unique").on(t.userId, t.key)],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    content: text().notNull(),
    embedding: vector({ dimensions: 1024 }).notNull(),
    embeddingModel: text().notNull(),
    lang: text().notNull(),
    sourceConversationId: uuid(),
    importance: real().notNull(),
    createdAt: createdAt(),
    lastUsedAt: timestamp({ withTimezone: true, precision: 3 }),
    supersededBy: uuid().references((): AnyPgColumn => memories.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index().on(t.userId, t.createdAt.desc())],
);
