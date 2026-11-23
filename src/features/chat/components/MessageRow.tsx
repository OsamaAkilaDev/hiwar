import { RotateCcw } from "lucide-react";
import { memo, type ReactNode } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";
import { dirProps } from "../../../lib/dir";
import { useChatStore } from "../store";
import { Markdown } from "./Markdown";

type Props = { message: MessageDTO; live: boolean; onRetry?: () => void };

export const MessageRow = memo(function MessageRow({
  message,
  live,
  onRetry,
}: Props) {
  const t = useT();
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
      {stopped ? <Note>{t("stopped")}</Note> : null}
      {empty ? <NoResponse onRetry={onRetry} /> : null}
      {status === "error" ? (
        <Note tone="danger">
          {t(message.error ? `error.${message.error}` : "error.incomplete")}
          {message.retryable === false ? null : (
            <RetryButton onRetry={onRetry} />
          )}
        </Note>
      ) : null}
    </div>
  );
});

export function NoResponse({ onRetry }: { onRetry?: () => void }) {
  const t = useT();
  return (
    <Note>
      {t("noResponse")}
      <RetryButton onRetry={onRetry} />
    </Note>
  );
}

export function Note({
  tone,
  children,
}: {
  tone?: "danger";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={`mt-2 flex items-center gap-3 text-sm ${tone === "danger" ? "text-danger" : "text-fg-subtle"}`}
    >
      {children}
    </p>
  );
}

export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const t = useT();
  if (!onRetry) return null;
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-accent transition-colors hover:bg-surface-2"
    >
      <RotateCcw className="size-3.5 rtl:-scale-x-100" aria-hidden />
      {t("retry")}
    </button>
  );
}

function Thinking() {
  const t = useT();
  return (
    <div
      role="status"
      aria-label={t("thinking")}
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
