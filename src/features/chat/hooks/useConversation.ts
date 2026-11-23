import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

// Not abortable on purpose: the route loader shares this query, and cancelling
// it when the screen remounts would surface as a load error.
export const useConversation = (conversationId: string) =>
  useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => getMessages(conversationId),
  });
