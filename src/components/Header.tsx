import { NotePencilIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useConversations } from "../features/sidebar/hooks/useConversations";
import { useT } from "../i18n";

const iconButton =
  "grid size-8.5 shrink-0 place-items-center rounded-[0.65rem] text-muted hover:bg-surface-2 hover:text-fg";

type Props = { sidebarOpen: boolean; onToggleSidebar: () => void };

export function Header({ sidebarOpen, onToggleSidebar }: Props) {
  const t = useT();
  const { conversationId } = useParams({ strict: false });
  const { conversations } = useConversations();
  const title = conversations.find((c) => c.id === conversationId)?.title;

  return (
    <header className="sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-1.5 border-line/60 border-b bg-glass pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur-[18px] backdrop-saturate-150">
      <button
        type="button"
        aria-label={t("chats")}
        aria-expanded={sidebarOpen}
        title={t("chats")}
        onClick={onToggleSidebar}
        className={`${iconButton} ${sidebarOpen ? "lg:hidden" : ""}`}
      >
        <SidebarSimpleIcon className="size-4.5 rtl:-scale-x-100" aria-hidden />
      </button>
      <p
        dir="auto"
        className="min-w-0 flex-1 truncate px-1.5 font-medium text-sm"
      >
        {title ?? t("newChat")}
      </p>
      <Link
        to="/"
        aria-label={t("newChat")}
        title={t("newChat")}
        className={`${iconButton} ${sidebarOpen ? "lg:hidden" : ""}`}
      >
        <NotePencilIcon className="size-4.5" aria-hidden />
      </Link>
    </header>
  );
}
