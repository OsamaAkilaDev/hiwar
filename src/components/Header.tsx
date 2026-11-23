import {
  MoonIcon,
  NotePencilIcon,
  SidebarSimpleIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useModelName } from "../features/chat/hooks/useModelName";
import { useConversations } from "../features/sidebar/hooks/useConversations";
import { useT } from "../i18n";
import { ar } from "../i18n/ar";
import { en } from "../i18n/en";
import { usePrefs } from "../lib/prefs";

const iconButton =
  "grid size-8.5 shrink-0 place-items-center rounded-[0.65rem] text-muted transition-colors hover:bg-surface-2 hover:text-fg";

type Props = { sidebarOpen: boolean; onToggleSidebar: () => void };

export function Header({ sidebarOpen, onToggleSidebar }: Props) {
  const t = useT();
  const { conversationId } = useParams({ strict: false });
  const { conversations } = useConversations();
  const model = useModelName(conversationId);
  const { locale, palette, setLocale, setTheme } = usePrefs();
  const other = locale === "ar" ? "en" : "ar";
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
      {model && (
        <span
          title={t("model")}
          className="hidden h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 font-mono text-muted text-xs sm:inline-flex"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <span dir="ltr">{model}</span>
        </span>
      )}
      {/* Shows the other language in its own script; lang keeps the
        screen-reader voice right, and the visible text is the name. */}
      <button
        type="button"
        lang={other}
        title={t("switchLanguage")}
        onClick={() => setLocale(other)}
        className="h-8.5 rounded-[0.65rem] px-2.5 text-muted text-sm transition-colors hover:bg-surface-2 hover:text-fg"
      >
        {(other === "ar" ? ar : en).languageName}
      </button>
      <button
        type="button"
        aria-label={t("darkTheme")}
        aria-pressed={palette === "dark"}
        title={t("darkTheme")}
        onClick={() => setTheme(palette === "dark" ? "light" : "dark")}
        className={iconButton}
      >
        {palette === "dark" ? (
          <MoonIcon className="size-4.5" aria-hidden />
        ) : (
          <SunIcon className="size-4.5" aria-hidden />
        )}
      </button>
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
