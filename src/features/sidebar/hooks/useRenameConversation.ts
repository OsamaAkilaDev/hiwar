import { useMutation, useQueryClient } from "@tanstack/react-query";
import { renameConversation } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import { type ConversationsData, patch } from "../cache";

export function useRenameConversation() {
  const queryClient = useQueryClient();
  const key = queryKeys.conversations();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameConversation(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ConversationsData>(key);
      queryClient.setQueryData<ConversationsData>(
        key,
        (data) => data && patch(data, id, { title }),
      );
      return { previous };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
