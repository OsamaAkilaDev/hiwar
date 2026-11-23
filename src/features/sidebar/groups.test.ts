import { expect, it } from "vitest";
import { groupConversations } from "./groups";

it("groups by local day", () => {
  const now = new Date(2026, 10, 23, 15);
  const at = (days: number, hour = 12) =>
    new Date(2026, 10, 23 - days, hour).toISOString();
  const c = (id: string, lastMessageAt: string) => ({
    id,
    title: null,
    lastMessageAt,
  });
  const groups = groupConversations(
    [c("a", at(0, 1)), c("b", at(1, 23)), c("c", at(7, 0)), c("d", at(8, 23))],
    now,
  );
  expect(groups.map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
    ["today", ["a"]],
    ["yesterday", ["b"]],
    ["previous7", ["c"]],
    ["older", ["d"]],
  ]);
});
