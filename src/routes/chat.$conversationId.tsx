import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Composer } from "../features/chat/components/Composer";
import { EmptyState } from "../features/chat/components/EmptyState";
import { MessageList } from "../features/chat/components/MessageList";
import { Note, RetryButton } from "../features/chat/components/MessageRow";
import { useConversation } from "../features/chat/hooks/useConversation";
import { useSendMessage } from "../features/chat/hooks/useSendMessage";
import { useT } from "../i18n";
import { getMessages } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export const Route = createFileRoute("/chat/$conversationId")({
  loader: ({ context: { queryClient }, params: { conversationId } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.messages(conversationId),
      queryFn: () => getMessages(conversationId),
    }),
  pendingComponent: ChatSkeleton,
  errorComponent: ChatError,
  component: ChatScreen,
});

const column =
  "mx-auto w-full max-w-[52rem] pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))]";

function ChatScreen() {
  const { conversationId } = Route.useParams();
  return <Conversation key={conversationId} conversationId={conversationId} />;
}

function Conversation({ conversationId }: { conversationId: string }) {
  const t = useT();
  const { data: messages = [] } = useConversation(conversationId);
  const { send, retry, stop, streamingId, isStreaming } =
    useSendMessage(conversationId);
  // What was already there when the chat opened; later messages ease in.
  const [settled] = useState(() => new Set(messages.map((m) => m.id)));
  const [announcement, setAnnouncement] = useState("");
  const watching = useRef<string | null>(null);

  useEffect(() => {
    if (streamingId) {
      watching.current = streamingId;
      setAnnouncement(t("thinking"));
      return;
    }
    const done = messages.find((m) => m.id === watching.current);
    if (!done || done.status === "streaming") return;
    watching.current = null;
    setAnnouncement(
      done.status === "complete"
        ? done.content.slice(0, 600)
        : done.status === "stopped"
          ? t("stopped")
          : t(done.error ? `error.${done.error}` : "error.incomplete"),
    );
  }, [streamingId, messages, t]);

  return (
    <main className="flex flex-1 flex-col">
      <div className={`${column} flex-1 pt-7`}>
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <MessageList
            messages={messages}
            streamingId={streamingId}
            settled={settled}
            onRetry={retry}
          />
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="sticky bottom-0 bg-linear-to-t from-bg from-60% to-transparent pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className={column}>
          <Composer isStreaming={isStreaming} onSend={send} onStop={stop} />
        </div>
      </div>
    </main>
  );
}

function ChatSkeleton() {
  const t = useT();
  return (
    <main
      className={`${column} flex flex-1 flex-col gap-8 pt-7`}
      aria-busy="true"
      aria-label={t("loading")}
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

// Shown when the conversation can't load, e.g. the installed app opened offline.
function ChatError() {
  const t = useT();
  const router = useRouter();
  return (
    <main className={`${column} flex flex-1 flex-col justify-center pb-[12vh]`}>
      <Note>
        {navigator.onLine ? t("loadFailed") : t("offline")}
        <RetryButton onRetry={() => router.invalidate()} />
      </Note>
    </main>
  );
}
