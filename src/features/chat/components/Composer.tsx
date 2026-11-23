import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

type Props = {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function Composer({ isStreaming, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0 && !isStreaming;

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
        Message
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
        placeholder="Message Hiwar"
        className="field-sizing-content max-h-52 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 leading-relaxed outline-none placeholder:text-fg-subtle"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-opacity hover:opacity-85"
        >
          <Square className="size-3.5" fill="currentColor" aria-hidden />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:bg-surface-2 disabled:text-fg-subtle"
        >
          <ArrowUp className="size-4.5" strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </form>
  );
}
