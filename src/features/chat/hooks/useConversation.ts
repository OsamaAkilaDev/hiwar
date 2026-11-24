import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { getMessages } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

/** The server's page size: a full page means older messages may exist. */
const PAGE = 50;

// A refetch returns only the newest page, so older pages the reader already
// scrolled back to are kept in front of it.
export async function fetchMessages(qc: QueryClient, conversationId: string) {
  const latest = await getMessages(conversationId);
  const first = latest[0]?.id;
  const held =
    qc.getQueryData<MessageDTO[]>(queryKeys.messages(conversationId)) ?? [];
  const older = first ? held.filter((m) => m.id < first) : [];
  return [...older, ...latest];
}

// Not abortable on purpose: the route loader shares this query, and cancelling
// it when the screen remounts would surface as a load error.
export const useConversation = (conversationId: string) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => fetchMessages(qc, conversationId),
  });
};

/** Loads the page before the oldest message held; ids are time-ordered (v7). */
export function useOlderMessages(
  conversationId: string,
  onLoad: (rows: MessageDTO[]) => void,
) {
  const qc = useQueryClient();
  const [more, setMore] = useState(
    () =>
      (qc.getQueryData<MessageDTO[]>(queryKeys.messages(conversationId))
        ?.length ?? 0) >= PAGE,
  );
  const loading = useRef(false);

  const loadOlder = useCallback(async () => {
    const key = queryKeys.messages(conversationId);
    const oldest = qc.getQueryData<MessageDTO[]>(key)?.[0]?.id;
    if (loading.current || !oldest) return;
    loading.current = true;
    try {
      const older = await getMessages(conversationId, { before: oldest });
      onLoad(older);
      qc.setQueryData<MessageDTO[]>(key, (rows = []) => [...older, ...rows]);
      setMore(older.length >= PAGE);
    } catch {
      // Left as is; scrolling back to the top tries again.
    } finally {
      loading.current = false;
    }
  }, [qc, conversationId, onLoad]);

  return more ? loadOlder : undefined;
}
