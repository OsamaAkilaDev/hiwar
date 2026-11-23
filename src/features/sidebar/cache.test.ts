import { expect, test } from "bun:test";
import type { InfiniteData } from "@tanstack/react-query";
import type { ConversationDTO, ConversationList } from "../../../shared/events";
import { patch, remove, upsertTop } from "./cache";

const conv = (id: string, title: string | null = null): ConversationDTO => ({
  id,
  title,
  lastMessageAt: "2026-01-01T00:00:00.000Z",
});

const data = (): InfiniteData<ConversationList, string | undefined> => ({
  pages: [
    { conversations: [conv("a"), conv("b")], nextCursor: "c1" },
    { conversations: [conv("c"), conv("d")], nextCursor: null },
  ],
  pageParams: [undefined, "c1"],
});

const ids = (d: ReturnType<typeof data>) =>
  d.pages.flatMap((p) => p.conversations.map((c) => c.id));

test("upsertTop inserts a new conversation at the top of page 0", () => {
  expect(ids(upsertTop(data(), conv("x")))).toEqual(["x", "a", "b", "c", "d"]);
});

test("upsertTop moves an existing conversation to the top without duplicating", () => {
  const next = upsertTop(data(), conv("c", "kept"));
  expect(ids(next)).toEqual(["c", "a", "b", "d"]);
  expect(next.pages[0]?.conversations[0]?.title).toBe("kept");
});

test("patch updates only the matching conversation", () => {
  const next = patch(data(), "b", { title: "Hi" });
  const all = next.pages.flatMap((p) => p.conversations);
  expect(all.map((c) => c.title)).toEqual([null, "Hi", null, null]);
});

test("remove drops the conversation from whichever page holds it", () => {
  expect(ids(remove(data(), "c"))).toEqual(["a", "b", "d"]);
  expect(ids(remove(data(), "a"))).toEqual(["b", "c", "d"]);
});

test("helpers return new objects and leave the input untouched", () => {
  const input = data();
  const snapshot = structuredClone(input);
  for (const next of [
    upsertTop(input, conv("x")),
    patch(input, "a", { title: "T" }),
    remove(input, "a"),
  ]) {
    expect(next).not.toBe(input);
    expect(next.pages).not.toBe(input.pages);
  }
  expect(input).toEqual(snapshot);
});
