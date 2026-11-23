import { RotateCcw } from "lucide-react";
import { memo, type ReactNode } from "react";
import { dirProps } from "../../../lib/dir";
import { useChatStore } from "../store";
import type { ChatRow } from "../types";
import { Markdown } from "./Markdown";

type Props = { message: ChatRow; live: boolean; onRetry?: () => void };

export const MessageRow = memo(function MessageRow({
  message,
  live,
  onRetry,
}: Props) {
  const streamed = useChatStore((s) => s.streams[message.id]?.text);
  const text = streamed ?? message.content;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          {...dirProps(message.content)}
          className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] bg-surface-2 px-4 py-2.5 leading-relaxed"
        >
          {message.content}
        </div>
      </div>
    );
  }

  const { status } = message;
  const stopped = status === "stopped" || (status === "streaming" && !live);
  const empty = status === "complete" && !text;

  return (
    <div className="group">
      {text ? <Markdown text={text} /> : null}
      {status === "streaming" && live && !text ? <Thinking /> : null}
      {stopped ? <Note>Stopped</Note> : null}
      {empty ? <NoResponse onRetry={onRetry} /> : null}
      {status === "error" ? (
        <Note tone="danger">
          {message.error ?? "This reply didn't finish."}
          {message.retryable === false ? null : (
            <RetryButton onRetry={onRetry} />
          )}
        </Note>
      ) : null}
    </div>
  );
});

export const NoResponse = ({ onRetry }: { onRetry?: () => void }) => (
  <Note>
    No response.
    <RetryButton onRetry={onRetry} />
  </Note>
);

function Note({ tone, children }: { tone?: "danger"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-2 flex items-center gap-3 text-sm ${tone === "danger" ? "text-danger" : "text-fg-subtle"}`}
    >
      {children}
    </p>
  );
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
  if (!onRetry) return null;
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-accent transition-colors hover:bg-surface-2"
    >
      <RotateCcw className="size-3.5 rtl:-scale-x-100" aria-hidden />
      Retry
    </button>
  );
}

function Thinking() {
  return (
    <div
      role="status"
      aria-label="Thinking"
      className="flex h-7 items-center gap-1"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-fg-muted"
          style={{
            animation: "pulse-dot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}
