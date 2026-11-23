import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAllConversations } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import type { ConversationsData } from "../../sidebar/cache";

export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  const key = queryKeys.conversations();
  return useMutation({
    mutationFn: deleteAllConversations,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ConversationsData>(key);
      queryClient.setQueryData<ConversationsData>(
        key,
        (data) =>
          data && {
            ...data,
            pages: [{ conversations: [], nextCursor: null }],
            pageParams: [undefined],
          },
      );
      queryClient.removeQueries({ queryKey: ["messages"] });
      return { previous };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
