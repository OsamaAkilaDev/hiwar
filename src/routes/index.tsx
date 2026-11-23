import { createFileRoute, redirect } from "@tanstack/react-router";
import { newId } from "../lib/ids";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/chat/$conversationId",
      params: { conversationId: newId() },
      replace: true,
    });
  },
});
