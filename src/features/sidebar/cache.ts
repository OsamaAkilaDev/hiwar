import type { InfiniteData } from "@tanstack/react-query";
import type { ConversationDTO, ConversationList } from "../../../shared/events";

export type ConversationsData = InfiniteData<
  ConversationList,
  string | undefined
>;

const mapPages = (
  data: ConversationsData,
  map: (conversations: ConversationDTO[]) => ConversationDTO[],
): ConversationsData => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    conversations: map(page.conversations),
  })),
});

export const remove = (data: ConversationsData, id: string) =>
  mapPages(data, (list) => list.filter((c) => c.id !== id));

export const patch = (
  data: ConversationsData,
  id: string,
  fields: Partial<ConversationDTO>,
) =>
  mapPages(data, (list) =>
    list.map((c) => (c.id === id ? { ...c, ...fields } : c)),
  );

export function upsertTop(
  data: ConversationsData,
  conversation: ConversationDTO,
): ConversationsData {
  const rest = remove(data, conversation.id);
  return {
    ...rest,
    pages: rest.pages.map((page, i) =>
      i === 0
        ? { ...page, conversations: [conversation, ...page.conversations] }
        : page,
    ),
  };
}
