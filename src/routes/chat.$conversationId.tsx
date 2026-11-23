import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Composer } from "../features/chat/components/Composer";
import { MessageList } from "../features/chat/components/MessageList";
import { useConversation } from "../features/chat/hooks/useConversation";
import { useSendMessage } from "../features/chat/hooks/useSendMessage";
import { getMessages } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export const Route = createFileRoute("/chat/$conversationId")({
  loader: ({ context: { queryClient }, params: { conversationId } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.messages(conversationId),
      queryFn: ({ signal }) => getMessages(conversationId, { signal }),
    }),
  pendingComponent: ChatSkeleton,
  component: ChatScreen,
});

const column = "mx-auto w-full max-w-[38rem] px-4";

function ChatScreen() {
  const { conversationId } = Route.useParams();
  const { data: messages = [] } = useConversation(conversationId);
  const { send, retry, stop, streamingId, isStreaming } =
    useSendMessage(conversationId);
  const [announcement, setAnnouncement] = useState("");
  const watching = useRef<string | null>(null);

  useEffect(() => {
    if (streamingId) watching.current = streamingId;
    const done = messages.find((m) => m.id === watching.current);
    if (streamingId || !done || done.status === "streaming") return;
    watching.current = null;
    if (done.status === "complete") setAnnouncement(done.content.slice(0, 600));
  }, [streamingId, messages]);

  const composer = (
    <Composer isStreaming={isStreaming} onSend={send} onStop={stop} />
  );

  if (messages.length === 0) {
    return (
      <main
        className={`${column} flex flex-1 flex-col justify-center pb-[12vh]`}
      >
        <h1 className="mb-6 text-center font-medium text-2xl tracking-tight">
          What's on your mind?
        </h1>
        {composer}
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className={`${column} flex-1 pt-4`}>
        <MessageList
          messages={messages}
          streamingId={streamingId}
          onRetry={retry}
        />
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="sticky bottom-0 bg-bg pb-4">
        <div className={column}>{composer}</div>
      </div>
    </main>
  );
}

function ChatSkeleton() {
  return (
    <main
      className={`${column} flex flex-1 flex-col gap-7 pt-4`}
      aria-busy="true"
    >
      <div className="ms-auto h-10 w-2/5 animate-pulse rounded-[18px] bg-surface-2" />
      <div className="flex flex-col gap-2.5">
        {["w-full", "w-11/12", "w-3/4"].map((w) => (
          <div
            key={w}
            className={`h-3.5 ${w} animate-pulse rounded bg-surface`}
          />
        ))}
      </div>
    </main>
  );
}
