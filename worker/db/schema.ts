import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
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

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  locale: text().notNull(),
  createdAt: createdAt(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    title: text(),
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
