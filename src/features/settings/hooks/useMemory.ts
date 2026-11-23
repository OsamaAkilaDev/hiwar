import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemorySnapshot } from "../../../../shared/events";
import {
  deleteFact,
  deleteMemory,
  forgetAll,
  getMemory,
  updateFact,
} from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";

export const useMemory = () =>
  useQuery({
    queryKey: queryKeys.memory(),
    queryFn: ({ signal }) => getMemory(signal),
  });

// One optimistic mutation: cancel, snapshot, apply, roll back on error, refetch.
function useMemoryMutation<V>(
  mutationFn: (vars: V) => Promise<void>,
  apply: (data: MemorySnapshot, vars: V) => MemorySnapshot,
) {
  const queryClient = useQueryClient();
  const key = queryKeys.memory();
  return useMutation({
    mutationKey: key,
    mutationFn,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemorySnapshot>(key);
      queryClient.setQueryData<MemorySnapshot>(
        key,
        (data) => data && apply(data, vars),
      );
      return { previous };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export const useUpdateFact = () =>
  useMemoryMutation(
    ({ id, value }: { id: string; value: string }) => updateFact(id, value),
    (data, { id, value }) => ({
      ...data,
      facts: data.facts.map((f) => (f.id === id ? { ...f, value } : f)),
    }),
  );

export const useDeleteFact = () =>
  useMemoryMutation(deleteFact, (data, id: string) => ({
    ...data,
    facts: data.facts.filter((f) => f.id !== id),
  }));

export const useDeleteMemory = () =>
  useMemoryMutation(deleteMemory, (data, id: string) => ({
    ...data,
    memories: data.memories.filter((m) => m.id !== id),
  }));

export const useForgetAll = () =>
  useMemoryMutation(forgetAll, () => ({ facts: [], memories: [] }));
