import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

// The model behind the latest assistant reply, read from the cached thread.
export const useModelName = (conversationId?: string) =>
  useQuery({
    queryKey: queryKeys.messages(conversationId ?? ""),
    queryFn: ({ signal }) => getMessages(conversationId ?? "", { signal }),
    enabled: Boolean(conversationId),
    select: (rows) => rows.findLast((m) => m.role === "assistant" && m.model),
  }).data?.model;
