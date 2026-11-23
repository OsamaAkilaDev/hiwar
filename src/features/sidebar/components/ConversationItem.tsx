import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ConversationDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";

type Props = {
  conversation: ConversationDTO;
  active: boolean;
  onNavigate?: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

const action =
  "grid size-8 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg";

export function ConversationItem({
  conversation: { id, title },
  active,
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
    <li className="group relative">
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
          className="w-full rounded-[0.65rem] border border-line bg-bg px-3 py-2 text-fg text-sm"
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
            className={`relative block truncate rounded-[0.65rem] py-2 ps-3.5 pe-18 text-sm hover:bg-surface-2 hover:text-fg ${active ? "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--line)] before:absolute before:inset-y-2.5 before:start-1 before:w-[3px] before:rounded-full before:bg-accent" : "text-muted"}`}
          >
            {label}
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
