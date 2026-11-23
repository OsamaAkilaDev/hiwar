import { ArrowUp, Square } from "lucide-react";
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
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      submit(e);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)] transition-colors focus-within:border-fg-subtle"
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
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("composerPlaceholder")}
        className="max-h-52 min-h-10 overflow-y-auto flex-1 resize-none bg-transparent px-2 py-2 leading-relaxed outline-none placeholder:text-fg-subtle"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label={t("stop")}
          aria-keyshortcuts="Escape"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-opacity hover:opacity-85"
        >
          <Square className="size-3.5" fill="currentColor" aria-hidden />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("send")}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:bg-surface-2 disabled:text-fg-subtle"
        >
          <ArrowUp className="size-4.5" strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </form>
  );
}
