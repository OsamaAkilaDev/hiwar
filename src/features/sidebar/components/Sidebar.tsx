import {
  GearSixIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ConversationDTO } from "../../../../shared/events";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
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

const modKey = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

const iconButton =
  "grid size-8.5 shrink-0 place-items-center rounded-[0.65rem] text-muted transition-colors hover:bg-surface-2 hover:text-fg";

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
  const [target, setTarget] = useState<ConversationDTO>();
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <div className="flex items-center gap-2.5 px-4.5 pt-4.5 pb-3.5">
        <Mark className="size-8 shrink-0" />
        <div className="font-bold font-display text-[1.2rem] leading-none tracking-[-0.03em]">
          hiwar
          <small
            lang="ar"
            className="mt-1 block font-kufi font-medium text-[0.7rem] text-subtle tracking-normal"
          >
            حوار
          </small>
        </div>
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
      <Link
        to="/"
        onClick={onNavigate}
        className="mx-3 mt-1 mb-2.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink text-sm transition-[transform,filter] hover:brightness-105 active:scale-[0.98]"
      >
        <PlusIcon weight="bold" className="size-4.5" aria-hidden />
        {t("newChat")}
      </Link>
      <div className="mx-3 flex h-9 items-center gap-2 rounded-[0.65rem] border border-line bg-surface px-3 text-subtle focus-within:border-accent">
        <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden />
        <input
          ref={search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              e.preventDefault();
              setQuery("");
            }
          }}
          aria-label={t("searchChats")}
          placeholder={t("searchChats")}
          className="min-w-0 flex-1 bg-transparent text-fg text-sm outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 font-mono text-[0.65rem] pointer-fine:block">
          {modKey} K
        </kbd>
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
          groupConversations(shown).map(({ key, items }) => (
            <section key={key}>
              <h2 className="px-2.5 pt-4 pb-1.5 font-medium text-subtle text-xs">
                {t(key)}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {items.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === conversationId}
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
      <div className="flex items-center border-line border-t px-3 py-2.5">
        <button
          type="button"
          aria-label={t("settings")}
          title={t("settings")}
          onClick={onOpenSettings}
          className={`${iconButton} ms-auto`}
        >
          <GearSixIcon className="size-4.5" aria-hidden />
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
