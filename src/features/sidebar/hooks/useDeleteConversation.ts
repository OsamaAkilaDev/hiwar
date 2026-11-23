import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import { type ConversationsData, remove } from "../cache";

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const key = queryKeys.conversations();
  return useMutation({
    mutationFn: deleteConversation,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ConversationsData>(key);
      queryClient.setQueryData<ConversationsData>(
        key,
        (data) => data && remove(data, id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.messages(id) });
      return { previous };
    },
    onError: (_error, _id, context) =>
      queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
