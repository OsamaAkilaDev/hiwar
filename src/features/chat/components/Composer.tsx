import {
  ArrowUpIcon,
  CaretDownIcon,
  CheckIcon,
  StopIcon,
} from "@phosphor-icons/react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useT } from "../../../i18n";
import { usePrefs } from "../../../lib/prefs";
import { MODEL_LABELS, type Model } from "../../../lib/resolve-prefs";
import { openAuth, useMe } from "../../auth/auth";

type Props = {
  /** Stagger the composer in on mount (empty state). */
  intro?: boolean;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function Composer({ intro, isStreaming, onSend, onStop }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0 && !isStreaming;
  const { data: me } = useMe();

  const wasStreaming = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resize whenever the text changes
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (
      wasStreaming.current &&
      !isStreaming &&
      document.activeElement === document.body
    )
      input.current?.focus();
    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onStop();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isStreaming, onStop]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    // Out of guest messages: keep the draft, ask to sign in.
    if (me?.guestLeft === 0) return openAuth(true);
    onSend(text.trim());
    setText("");
    input.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      !matchMedia("(pointer: coarse)").matches
    ) {
      submit(e);
    }
  };

  return (
    <>
      <form
        onSubmit={submit}
        className={`rounded-[1.25rem] border border-line bg-glass shadow-lift backdrop-blur-[20px] backdrop-saturate-150 transition-[border-color,box-shadow] focus-within:border-[color-mix(in_oklab,var(--accent)_55%,var(--line))] focus-within:shadow-[0_0_0_4px_var(--accent-soft),var(--lift)] ${intro ? "enter [--i:1]" : ""}`}
      >
        <label htmlFor="composer" className="sr-only">
          {t("composerLabel")}
        </label>
        <textarea
          id="composer"
          ref={input}
          dir="auto"
          rows={1}
          // biome-ignore lint/a11y/noAutofocus: the composer is the page's only task
          autoFocus={matchMedia("(pointer: fine)").matches}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("composerPlaceholder")}
          className="block max-h-56 min-h-14 w-full resize-none overflow-y-auto bg-transparent px-4.5 pt-4 pb-1.5 text-[0.95rem] leading-relaxed outline-none placeholder:text-subtle [&:lang(ar)]:leading-[1.85]"
        />
        <div className="flex items-center justify-between px-2.5 pt-1 pb-2.5">
          <ModelPicker />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={t("stop")}
              aria-keyshortcuts="Escape"
              className={sendButton}
            >
              <StopIcon weight="fill" className="size-4.5" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label={t("send")}
              className={`${sendButton} disabled:scale-[0.86] disabled:bg-surface-2 disabled:text-subtle`}
            >
              <ArrowUpIcon weight="bold" className="size-4.5" aria-hidden />
            </button>
          )}
        </div>
      </form>
      <div
        className={`mt-2 flex items-center gap-4 justify-center text-subtle text-xs ${intro ? "enter [--i:2]" : ""}`}
      >
        <p className="hidden gap-4 pointer-fine:flex">
          <span>
            <Kbd>Enter</Kbd> {t("hint.send")}
          </span>
          <span>
            <Kbd>Shift Enter</Kbd> {t("hint.newline")}
          </span>
          <span>
            <Kbd>Esc</Kbd> {t("hint.stop")}
          </span>
        </p>
      </div>
    </>
  );
}

const sendButton =
  "spring grid size-9 place-items-center rounded-xl bg-accent text-accent-ink hover:brightness-105";

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-[0.3rem] border border-line px-1.5 font-mono text-[0.7rem]">
    {children}
  </kbd>
);

// Picks which model answers first; the other stays as the fallback. A popover
// listbox, not a <select>: the native option list can't be styled.
const MODELS: Model[] = ["gemini", "groq"];

function ModelPicker() {
  const t = useT();
  const model = usePrefs((s) => s.model);
  const setModel = usePrefs((s) => s.setModel);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const options = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = options();
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + step + items.length) % items.length]?.focus();
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-haspopup="listbox"
        aria-label={`${t("model")}: ${MODEL_LABELS[model]}`}
        className="flex h-8 items-center gap-1.5 rounded-lg ps-2.5 pe-2 font-medium text-muted text-xs transition-colors [anchor-name:--model] hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span dir="ltr">{MODEL_LABELS[model]}</span>
        <CaretDownIcon weight="bold" className="size-3" aria-hidden />
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="listbox"
        aria-label={t("model")}
        onToggle={(e) => {
          if (e.newState === "open") options()[MODELS.indexOf(model)]?.focus();
        }}
        onKeyDown={onKeyDown}
        className="menu min-w-64 rounded-2xl border border-line bg-surface p-1.5 text-start shadow-lift [position-anchor:--model]"
      >
        {MODELS.map((m) => (
          <button
            key={m}
            type="button"
            role="option"
            aria-selected={m === model}
            onClick={() => {
              setModel(m);
              menu.current?.hidePopover();
            }}
            className="flex w-full items-center gap-3 rounded-[0.625rem] px-2.5 py-2 text-start outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            <span className="flex-1">
              <span className="block font-medium text-fg text-sm">
                <bdi>{MODEL_LABELS[m]}</bdi>
              </span>
              <span className="block text-subtle text-xs">
                {t(m === "gemini" ? "modelGemini" : "modelGroq")}
              </span>
            </span>
            {m === model ? (
              <CheckIcon
                weight="bold"
                className="size-4 text-accent-text"
                aria-hidden
              />
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
}
