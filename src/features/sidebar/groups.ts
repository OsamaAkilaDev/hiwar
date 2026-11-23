import type { ConversationDTO } from "../../../shared/events";

const keys = ["today", "yesterday", "previous7", "older"] as const;

export function groupConversations(
  conversations: ConversationDTO[],
  now = new Date(),
) {
  const daysAgo = (n: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - n).getTime();
  const groups = {
    today: [] as ConversationDTO[],
    yesterday: [] as ConversationDTO[],
    previous7: [] as ConversationDTO[],
    older: [] as ConversationDTO[],
  };
  for (const c of conversations) {
    const at = new Date(c.lastMessageAt).getTime();
    groups[
      at >= daysAgo(0)
        ? "today"
        : at >= daysAgo(1)
          ? "yesterday"
          : at >= daysAgo(7)
            ? "previous7"
            : "older"
    ].push(c);
  }
  return keys
    .map((key) => ({ key, items: groups[key] }))
    .filter((group) => group.items.length > 0);
}
