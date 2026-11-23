import { ArrowUpIcon, StopIcon } from "@phosphor-icons/react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useT } from "../../../i18n";

type Props = {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function Composer({ isStreaming, onSend, onStop }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0 && !isStreaming;

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
        className="rounded-[1.25rem] border border-line bg-glass shadow-lift backdrop-blur-[20px] backdrop-saturate-150 transition-[border-color,box-shadow] focus-within:border-[color-mix(in_oklab,var(--accent)_55%,var(--line))] focus-within:shadow-[0_0_0_4px_var(--accent-soft),var(--lift)]"
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
        <div className="flex justify-end px-2.5 pt-1 pb-2.5">
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
              className={`${sendButton} disabled:bg-surface-2 disabled:text-subtle`}
            >
              <ArrowUpIcon weight="bold" className="size-4.5" aria-hidden />
            </button>
          )}
        </div>
      </form>
      <p className="mt-2 hidden justify-center gap-4 text-subtle text-xs pointer-fine:flex">
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
    </>
  );
}

const sendButton =
  "grid size-9 place-items-center rounded-xl bg-accent text-accent-ink transition-[transform,filter] hover:brightness-105 active:scale-95";

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-[0.3rem] border border-line px-1.5 font-mono text-[0.7rem]">
    {children}
  </kbd>
);
