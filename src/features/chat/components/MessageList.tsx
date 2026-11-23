import { Fragment, useEffect, useRef } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { useChatStore } from "../store";
import { MessageRow, NoResponse } from "./MessageRow";

type Props = {
  messages: MessageDTO[];
  streamingId: string | null;
  onRetry: (userMessageId: string) => void;
};

const NEAR_BOTTOM_PX = 120;

export function MessageList({ messages, streamingId, onRetry }: Props) {
  const end = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the stream only while the reader is at the bottom.
  useEffect(() => {
    const onScroll = () => {
      const { scrollY, innerHeight } = window;
      pinned.current =
        document.documentElement.scrollHeight - (scrollY + innerHeight) <
        NEAR_BOTTOM_PX;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A new message always pins to the bottom; streaming text follows while pinned.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when a message is added
  useEffect(() => {
    pinned.current = true;
    const follow = () => {
      if (pinned.current) end.current?.scrollIntoView({ block: "end" });
    };
    follow();
    return useChatStore.subscribe(follow);
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-7 pb-6">
      {messages.map((m, i) => {
        if (m.role === "assistant") {
          const prev = messages[i - 1];
          return (
            <MessageRow
              key={m.id}
              message={m}
              live={m.id === streamingId}
              onRetry={
                prev?.role === "user" ? () => onRetry(prev.id) : undefined
              }
            />
          );
        }
        const unanswered = messages[i + 1]?.role !== "assistant";
        return (
          <Fragment key={m.id}>
            <MessageRow message={m} live={false} />
            {unanswered && streamingId === null ? (
              <div className="-mt-5">
                <NoResponse onRetry={() => onRetry(m.id)} />
              </div>
            ) : null}
          </Fragment>
        );
      })}
      <div ref={end} className="scroll-mb-28" />
    </div>
  );
}
