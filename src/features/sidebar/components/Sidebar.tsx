import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { SquarePen } from "lucide-react";
import { useState } from "react";
import type { ConversationDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";
import { groupConversations } from "../groups";
import { useConversations } from "../hooks/useConversations";
import { useDeleteConversation } from "../hooks/useDeleteConversation";
import { useRenameConversation } from "../hooks/useRenameConversation";
import { ConversationItem } from "./ConversationItem";
import { DeleteDialog } from "./DeleteDialog";
import { SidebarSkeleton } from "./SidebarSkeleton";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
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
  const error = rename.isError
    ? t("error.rename")
    : remove.isError
      ? t("error.delete")
      : null;

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="p-2">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-surface-2"
        >
          <SquarePen className="size-4.5" aria-hidden />
          {t("newChat")}
        </Link>
      </div>
      <nav
        aria-label={t("chats")}
        className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
      >
        {error && (
          <p role="alert" className="px-3 text-danger text-sm">
            {error}
          </p>
        )}
        {isPending ? (
          <SidebarSkeleton />
        ) : conversations.length === 0 ? (
          <p className="px-3 py-2 text-fg-subtle text-sm">{t("noChats")}</p>
        ) : (
          groupConversations(conversations).map(({ key, items }) => (
            <section key={key}>
              <h2 className="px-3 pt-4 pb-1 font-medium text-fg-subtle text-xs">
                {t(key)}
              </h2>
              <ul>
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
        {hasNextPage && (
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="px-3 py-2 text-fg-muted text-sm hover:text-fg disabled:opacity-60"
          >
            {t("showMore")}
          </button>
        )}
      </nav>
      <DeleteDialog
        title={target?.title ?? null}
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
