import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../../i18n";

type Props = { text: string; label?: "copy" | "copyCode"; className?: string };

export function CopyButton({ text, label = "copy", className }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const name = copied ? t("copied") : t(label);
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      onClick={copy}
      className={`grid place-items-center text-subtle hover:bg-surface-2 hover:text-fg ${className ?? ""}`}
    >
      {copied ? (
        <CheckIcon className="size-4" aria-hidden />
      ) : (
        <CopyIcon className="size-4" aria-hidden />
      )}
    </button>
  );
}
