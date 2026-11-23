import { RotateCcw } from "lucide-react";
import { memo } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { dirOf } from "../../../lib/dir";
import { useChatStore } from "../store";
import { Markdown } from "./Markdown";

type Props = { message: MessageDTO; onRetry: (id: string) => void };

export const MessageRow = memo(function MessageRow({
  message,
  onRetry,
}: Props) {
  const streamed = useChatStore((s) => s.streams[message.id]?.text);
  const text = streamed ?? message.content;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          dir={dirOf(message.content)}
          className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] bg-surface-2 px-4 py-2.5 leading-relaxed"
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {text ? <Markdown text={text} /> : null}
      {message.status === "streaming" && !text ? <Thinking /> : null}
      {message.status === "stopped" ? (
        <p className="mt-2 text-fg-subtle text-sm">Stopped</p>
      ) : null}
      {message.status === "error" ? (
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="text-danger">The response failed.</span>
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-accent transition-colors hover:bg-surface-2"
          >
            <RotateCcw className="size-3.5 rtl:-scale-x-100" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
});

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
