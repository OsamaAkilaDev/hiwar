import { createFileRoute, redirect } from "@tanstack/react-router";
import { newId } from "../lib/ids";
import { queryKeys } from "../lib/query-keys";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context: { queryClient } }) => {
    const conversationId = newId();
    // A fresh id has no messages; seeding that skips a server round trip
    // before the empty chat can render.
    queryClient.setQueryData(queryKeys.messages(conversationId), []);
    throw redirect({
      to: "/chat/$conversationId",
      params: { conversationId },
      replace: true,
    });
  },
});
