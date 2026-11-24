import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ConversationDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";
import { usePrefs } from "../../../lib/prefs";

type Props = {
  conversation: ConversationDTO;
  active: boolean;
  /** Added to the top of the list after it loaded; eases in. */
  fresh?: boolean;
  onNavigate?: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

const action =
  "grid size-8 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg";

export function ConversationItem({
  conversation: { id, title },
  active,
  fresh,
  onNavigate,
  onRename,
  onDelete,
}: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  const wasEditing = useRef(false);
  const label = title ?? t("newChat");
  const rtlUI = usePrefs((s) => s.locale) === "ar";

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (wasEditing.current && document.activeElement === document.body) {
      link.current?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const save = (value: string) => {
    const next = value.trim();
    setEditing(false);
    if (!cancelled.current && next && next !== title) onRename(next);
  };

  return (
    <li className={`group relative ${fresh ? "row-in" : ""}`}>
      {editing ? (
        <input
          ref={input}
          defaultValue={title ?? ""}
          aria-label={t("rename")}
          maxLength={80}
          onBlur={(e) => save(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Escape") cancelled.current = true;
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          className="w-full rounded-[0.65rem] border border-line bg-bg h-[34px] px-3 py-1.5 text-[0.9rem] text-fg"
        />
      ) : (
        <>
          <Link
            ref={link}
            to="/chat/$conversationId"
            params={{ conversationId: id }}
            preload="intent"
            title={label}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`relative block h-[34px] rounded-[0.65rem] py-1.5 ps-3.5 text-[0.9rem] leading-[22px] hover:bg-surface-2 hover:text-fg ${active ? "pe-18 bg-surface text-fg shadow-[inset_0_0_0_1px_var(--line)] before:absolute before:inset-y-2.5 before:start-1 before:w-[3px] before:rounded-full before:bg-accent" : "pe-3 text-muted group-focus-within:pe-18 group-hover:pe-18 pointer-coarse:pe-18"}`}
          >
            {/* Truncates at the title's own end (dir auto), lined up with the UI. */}
            <span
              dir="auto"
              className="block truncate"
              style={{ textAlign: rtlUI ? "right" : "left" }}
            >
              {label}
            </span>
          </Link>
          <div
            className={`absolute inset-y-0 end-1 flex items-center gap-0.5 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 ${active ? "opacity-100" : "opacity-0"}`}
          >
            <button
              type="button"
              aria-label={`${t("rename")}: ${label}`}
              onClick={() => {
                cancelled.current = false;
                setEditing(true);
              }}
              className={action}
            >
              <PencilSimpleIcon className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`${t("delete")}: ${label}`}
              onClick={onDelete}
              className={action}
            >
              <TrashIcon className="size-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </li>
  );
}
