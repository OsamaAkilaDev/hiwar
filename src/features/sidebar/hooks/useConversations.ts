import { useInfiniteQuery } from "@tanstack/react-query";
import { listConversations } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

export function useConversations() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.conversations(),
    queryFn: ({ pageParam, signal }) => listConversations(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  return {
    conversations: query.data?.pages.flatMap((p) => p.conversations) ?? [],
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isPending: query.isPending,
  };
}
