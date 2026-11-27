import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { create } from "zustand";
import { getMe, signOut } from "../../lib/api";
import { usePrefs } from "../../lib/prefs";
import { queryKeys } from "../../lib/query-keys";

export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
  });

/** `limit`: opened because a guest used up their free messages. */
export const useAuthDialog = create<{ open: boolean; limit: boolean }>(() => ({
  open: false,
  limit: false,
}));

export const openAuth = (limit = false) =>
  useAuthDialog.setState({ open: true, limit });

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    usePrefs.getState().setName("");
    await navigate({ to: "/" });
    // Another account's chats must not linger in the cache.
    await queryClient.resetQueries();
  };
}
