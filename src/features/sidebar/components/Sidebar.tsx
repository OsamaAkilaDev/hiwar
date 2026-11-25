import {
  MagnifyingGlassIcon,
  NotePencilIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ConversationDTO } from "../../../../shared/events";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
import { usePrefs } from "../../../lib/prefs";
import { groupConversations } from "../groups";
import { useConversations } from "../hooks/useConversations";
import { useDeleteConversation } from "../hooks/useDeleteConversation";
import { useRenameConversation } from "../hooks/useRenameConversation";
import { ConversationItem } from "./ConversationItem";
import { SidebarSkeleton } from "./SidebarSkeleton";

type Props = {
  onNavigate?: () => void;
  onCollapse?: () => void;
  onOpenSettings: () => void;
};

const iconButton =
  "grid size-8.5 shrink-0 place-items-center rounded-[0.65rem] text-muted hover:bg-surface-2 hover:text-fg";

const row =
  "flex h-[34px] w-full items-center gap-2.5 rounded-lg px-3 text-start text-[0.9rem] hover:bg-surface-2";

export function Sidebar({ onNavigate, onCollapse, onOpenSettings }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { conversationId } = useParams({ strict: false });
  const {
    conversations,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isPending,
  } = useConversations();
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const topId = useRef<string>(undefined);
  const [target, setTarget] = useState<ConversationDTO>();
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const locale = usePrefs((s) => s.locale);
  const name = usePrefs((s) => s.name);
  const label = name || t("you");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setSearching(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Rows that show up above the previous top row after the list first loaded.
  const seen = useRef<Set<string>>(null);
  const fresh = useRef(new Set<string>());
  if (!isPending) {
    const ids = conversations.map((c) => c.id);
    if (!seen.current) seen.current = new Set(ids);
    else {
      const top = ids.indexOf(topId.current ?? "");
      for (const [i, id] of ids.entries())
        if (!seen.current.has(id)) {
          seen.current.add(id);
          if (top < 0 || i < top) fresh.current.add(id);
        }
    }
    topId.current = ids[0];
  }

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? conversations.filter((c) =>
        (c.title ?? t("newChat")).toLowerCase().includes(needle),
      )
    : conversations;
  const error = rename.isError
    ? t("error.rename")
    : remove.isError
      ? t("error.delete")
      : null;

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14 shrink-0 items-center gap-2.5 ps-5 pe-4.5">
        <Mark className="size-7 shrink-0" />
        {locale === "ar" ? (
          <span className="text-trim font-bold font-kufi text-[1.15rem] leading-none">
            حوار
          </span>
        ) : (
          <span className="text-trim font-bold font-display text-[1.2rem] leading-none tracking-[-0.03em]">
            Hiwar
          </span>
        )}
        {onCollapse && (
          <button
            type="button"
            aria-label={t("hideSidebar")}
            title={t("hideSidebar")}
            onClick={onCollapse}
            className={`${iconButton} ms-auto`}
          >
            <SidebarSimpleIcon
              className="size-4.5 rtl:-scale-x-100"
              aria-hidden
            />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-2 pb-3">
        <Link to="/" onClick={onNavigate} className={row}>
          <NotePencilIcon className="size-4.5 shrink-0" aria-hidden />
          {t("newChat")}
        </Link>
        {searching ? (
          <div
            className={`${row} border border-line bg-surface text-subtle focus-within:border-accent`}
          >
            <MagnifyingGlassIcon className="size-4.5 shrink-0" aria-hidden />
            <input
              // biome-ignore lint/a11y/noAutofocus: the user just asked to search
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => !query && setSearching(false)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.preventDefault();
                setQuery("");
                setSearching(false);
              }}
              aria-label={t("searchChats")}
              placeholder={t("searchChats")}
              className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearching(true)}
            className={row}
          >
            <MagnifyingGlassIcon className="size-4.5 shrink-0" aria-hidden />
            {t("searchChats")}
          </button>
        )}
      </div>
      <nav
        aria-label={t("chats")}
        className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
      >
        {error && (
          <p role="alert" className="px-3 pt-2 text-danger text-sm">
            {error}
          </p>
        )}
        {isPending ? (
          <SidebarSkeleton />
        ) : shown.length === 0 ? (
          <p className="px-3 py-3 text-subtle text-sm">
            {needle ? t("noMatches") : t("noChats")}
          </p>
        ) : (
          groupConversations(shown).map(({ key, items }, i) => (
            <section key={key}>
              <h2
                className={`px-3 pb-1 font-medium text-subtle text-xs ${i === 0 ? "pt-2" : "pt-4"}`}
              >
                {t(key)}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {items.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === conversationId}
                    fresh={fresh.current.has(conversation.id)}
                    onNavigate={onNavigate}
                    onRename={(title) =>
                      rename.mutate({ id: conversation.id, title })
                    }
                    onDelete={() => {
                      setTarget(conversation);
                      setConfirming(true);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
        {hasNextPage && !needle && (
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="px-3 py-2 text-muted text-sm hover:text-fg disabled:opacity-60"
          >
            {t("showMore")}
          </button>
        )}
      </nav>
      <div className="border-line border-t p-2">
        <button type="button" onClick={onOpenSettings} className={row}>
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-full bg-accent font-semibold text-[0.6rem] text-accent-ink"
          >
            {Array.from(label)[0]?.toUpperCase()}
          </span>
          <span className="-my-1 truncate py-1">{label}</span>
        </button>
      </div>
      <ConfirmDialog
        heading={
          target?.title
            ? t("deleteTitle", { title: target.title })
            : t("deleteTitleUntitled")
        }
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          if (!target) return;
          remove.mutate(target.id);
          if (target.id === conversationId) navigate({ to: "/" });
        }}
      />
    </div>
  );
}
