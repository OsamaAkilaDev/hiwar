import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { memo, type ReactNode, useEffect, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
import { dirProps } from "../../../lib/dir";
import { usePrefs } from "../../../lib/prefs";
import { useChatStore } from "../store";
import { CopyButton } from "./CopyButton";
import { Markdown } from "./Markdown";

type Props = {
  message: MessageDTO;
  live: boolean;
  /** True for rows added after the thread loaded; they ease in. */
  fresh?: boolean;
  onRetry?: () => void;
};

export const MessageRow = memo(function MessageRow({
  message,
  live,
  fresh,
  onRetry,
}: Props) {
  const t = useT();
  const streamed = useChatStore((s) => s.streams[message.id]?.text);
  const text = streamed ?? message.content;

  if (message.role === "user") {
    return (
      <div className={`flex justify-end ${fresh ? "animate-rise" : ""}`}>
        {/* The corner radius is logical on the UI side, so the small corner
          stays at the outer bottom edge whatever the message's own direction. */}
        <div className="max-w-[85%] rounded-ss-[1.125rem] rounded-se-[1.125rem] rounded-es-[1.125rem] rounded-ee-[0.375rem] bg-surface-2 px-4 py-2.5">
          <p
            {...dirProps(message.content)}
            className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed [&:lang(ar)]:leading-[1.85]"
          >
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const { status } = message;
  const stopped = status === "stopped" || (status === "streaming" && !live);
  const empty = status === "complete" && !text;
  const retryable =
    message.retryable !== false ||
    !message.error ||
    message.error === "cut_off";

  return (
    <div
      className={`group grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3.5 ${fresh ? "animate-rise" : ""}`}
    >
      <Mark className="mt-0.5 size-7" />
      <div className={live && text ? "streaming" : undefined}>
        <div {...(text ? dirProps(text) : {})}>
          {text ? <Markdown text={text} /> : null}
        </div>
        {status === "streaming" && live && !text ? <Thinking /> : null}
        {stopped ? (
          <Note>
            {t("stopped")}
            <RetryButton onRetry={onRetry} />
          </Note>
        ) : null}
        {empty ? <NoResponse onRetry={onRetry} /> : null}
        {status === "error" ? (
          <Note tone="danger">
            {t(message.error ? `error.${message.error}` : "error.incomplete")}
            {retryable ? <RetryButton onRetry={onRetry} /> : null}
          </Note>
        ) : null}
        {status === "complete" && text ? (
          <div className="mt-2.5 flex items-center gap-1 text-subtle text-xs opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
            {message.model ? (
              <span dir="ltr" className="me-2 font-mono">
                {message.model}
              </span>
            ) : null}
            <CopyButton text={text} className="size-7 rounded-lg" />
            {onRetry ? (
              <button
                type="button"
                aria-label={t("regenerate")}
                title={t("regenerate")}
                onClick={onRetry}
                className="grid size-7 place-items-center rounded-lg transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <ArrowClockwiseIcon className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
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
  const locale = usePrefs((s) => s.locale);
  return (
    <p
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      role={tone === "danger" ? "alert" : undefined}
      className={`mt-2 flex w-fit flex-wrap items-center gap-x-3 gap-y-1 text-sm [&:lang(ar)]:leading-[1.85] ${tone === "danger" ? "text-danger" : "text-subtle"}`}
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
      className="inline-flex items-center gap-1.5 -my-1 whitespace-nowrap rounded-md px-2 py-2 text-accent-text transition-colors hover:bg-surface-2"
    >
      <ArrowClockwiseIcon className="size-3.5" aria-hidden />
      {t("retry")}
    </button>
  );
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Thinking() {
  const t = useT();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="flex items-center gap-3 py-1 text-muted text-sm"
    >
      <span className="min-w-[1ch] font-mono text-[1.25rem] text-accent-text leading-none">
        {FRAMES[frame]}
      </span>
      {t("thinking")}
    </div>
  );
}
