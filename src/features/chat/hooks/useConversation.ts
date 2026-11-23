import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

export const useConversation = (conversationId: string) =>
  useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ signal }) => getMessages(conversationId, { signal }),
  });
