import { ArrowClockwiseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { type CSSProperties, memo, useEffect, useState } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
import { type Citation, citedIn, domainOf } from "../../../lib/citations";
import { dirOf, dirProps } from "../../../lib/dir";
import { MODEL_LABELS } from "../../../lib/resolve-prefs";
import { useChatStore } from "../store";
import { CopyButton } from "./CopyButton";
import { Markdown } from "./Markdown";
import { Note, RetryButton } from "./Note";

// Readable names for the models the gateway can use; unknown ids show as is.
const MODEL_NAMES: Record<string, string> = {
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "openai/gpt-oss-120b": "GPT-OSS 120B",
};
const modelName = (id: string) => MODEL_NAMES[id] ?? id;

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
  const search = useChatStore((s) => s.streams[message.id]?.search);
  const liveCitations = useChatStore((s) => s.streams[message.id]?.citations);
  const text = streamed ?? message.content;
  const citations = liveCitations ?? message.citations;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        {/* The corner radius is logical on the UI side, so the small corner
          stays at the outer bottom edge whatever the message's own direction. */}
        <div
          className={`max-w-[85%] ${fresh ? "bubble-in" : ""} rounded-ss-[1.125rem] rounded-se-[1.125rem] rounded-es-[1.125rem] rounded-ee-[0.375rem] bg-surface-2 px-4 py-2.5`}
        >
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
      <Mark
        className="mt-0.5 size-7"
        animate={live && !text ? "think" : undefined}
      />
      <div className={live && text ? "streaming" : undefined}>
        <div {...(text ? dirProps(text) : {})}>
          {text ? <Markdown text={text} citations={citations} /> : null}
        </div>
        {live && search ? (
          <Searching query={search} />
        ) : status === "streaming" && live && !text ? (
          <LoadingWords />
        ) : null}
        {citations?.length ? (
          <Sources
            citations={citations}
            text={text}
            done={status === "complete"}
          />
        ) : null}
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
          <div className="mt-2.5 flex items-center gap-1 text-subtle text-xs">
            {message.model ? (
              <span dir="ltr" className="me-1.5">
                {modelName(message.model)}
                {message.fallbackFrom
                  ? ` · ${t("modelBusy", { name: MODEL_LABELS[message.fallbackFrom] })}`
                  : null}
              </span>
            ) : null}
            <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
              <CopyButton text={text} className="size-7 rounded-lg" />
              {onRetry ? (
                <button
                  type="button"
                  aria-label={t("regenerate")}
                  title={t("regenerate")}
                  onClick={onRetry}
                  className="grid size-7 place-items-center rounded-lg hover:bg-surface-2 hover:text-fg"
                >
                  <ArrowClockwiseIcon className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
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

const graphemes = (word: string) =>
  Array.from(new Intl.Segmenter().segment(word), (g) => g.segment);

const TYPE_MS = 45;
const DELETE_MS = 25;
const HOLD_MS = 1500;

/** Rotates loading words, deleting and retyping each one like a cursor would. */
function LoadingWords() {
  const t = useT();

  const key = t("loadingWords");
  const [shown, setShown] = useState("");

  useEffect(() => {
    const list = key.split("|");
    const pick = (not?: string) => {
      const pool = list.filter((w) => w !== not);
      return pool[Math.floor(Math.random() * pool.length)] ?? list[0] ?? "";
    };
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) =>
      new Promise<void>((done) => {
        timer = setTimeout(done, ms);
      });
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      let word = pick();
      while (alive) {
        const chars = graphemes(word);
        if (still) setShown(word);
        else
          for (let i = 1; i <= chars.length && alive; i++) {
            setShown(chars.slice(0, i).join(""));
            await wait(TYPE_MS);
          }
        await wait(HOLD_MS);
        if (!still)
          for (let i = chars.length - 1; i >= 0 && alive; i--) {
            setShown(chars.slice(0, i).join(""));
            await wait(DELETE_MS);
          }
        word = pick(word);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [key]);

  return (
    <div aria-hidden className="typing-caret py-1 text-muted text-sm">
      {shown}
    </div>
  );
}

function Searching({ query }: { query: string }) {
  const t = useT();
  return (
    <p className="enter mt-1 flex w-fit max-w-full items-center gap-2 rounded-full bg-surface-2 py-1.5 ps-2.5 pe-3.5 text-muted text-sm [--i:0]">
      <MagnifyingGlassIcon
        className="size-3.5 shrink-0 animate-pulse text-accent-text"
        aria-hidden
      />
      <span className="truncate">
        {t("searching")}{" "}
        <span {...dirProps(query)} className="text-fg">
          {query}
        </span>
      </span>
    </p>
  );
}

// Only the sources the answer cites, under their original numbers. A reply
// that cites nothing still shows its top results once it is done.
function Sources({
  citations,
  text,
  done,
}: {
  citations: Citation[];
  text: string;
  done: boolean;
}) {
  const cited = citedIn(text).filter((n) => citations[n - 1]);
  const shown = cited.length
    ? cited.map((n) => ({ n, source: citations[n - 1] as Citation }))
    : done
      ? citations.slice(0, 5).map((source, i) => ({ n: i + 1, source }))
      : [];
  if (!shown.length) return null;
  return <SourceList shown={shown} dir={dirOf(text)} />;
}

function SourceList({
  shown,
  dir,
}: {
  shown: { n: number; source: Citation }[];
  dir: "rtl" | "ltr";
}) {
  const t = useT();
  return (
    <nav
      aria-label={t("sources")}
      dir={dir}
      className="mt-3 flex flex-wrap gap-1.5"
    >
      {shown.map(({ n, source: c }, i) => (
        <a
          key={c.url}
          href={c.url}
          title={c.title}
          target="_blank"
          rel="noopener noreferrer"
          className="row-in inline-flex max-w-56 items-center gap-1.5 rounded-full bg-surface-2 py-1 ps-1 pe-2.5 text-muted text-xs transition-colors hover:bg-accent-soft hover:text-fg"
          style={{ "--i": i } as CSSProperties}
        >
          <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-surface px-1 font-mono text-[0.65rem] text-accent-text">
            {n}
          </span>
          <span dir="ltr" className="truncate">
            {domainOf(c.url)}
          </span>
        </a>
      ))}
    </nav>
  );
}
