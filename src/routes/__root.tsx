import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Moon, PanelLeft, SquarePen, Sun } from "lucide-react";
import { useRef, useState } from "react";
import { Sidebar } from "../features/sidebar/components/Sidebar";
import { useT } from "../i18n";
import { ar } from "../i18n/ar";
import { en } from "../i18n/en";
import { usePrefs } from "../lib/prefs";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});

const iconButton =
  "grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg";

const readOpen = () => {
  try {
    return localStorage.getItem("hiwar.sidebar") !== "closed";
  } catch {
    return true;
  }
};

function Root() {
  const t = useT();
  const [open, setOpen] = useState(readOpen);
  const drawer = useRef<HTMLDialogElement>(null);
  const { locale, theme, setLocale, setTheme } = usePrefs();
  const other = locale === "ar" ? "en" : "ar";

  const toggle = () => {
    if (!matchMedia("(min-width: 64rem)").matches) {
      drawer.current?.showModal();
      return;
    }
    try {
      localStorage.setItem("hiwar.sidebar", open ? "closed" : "open");
    } catch {}
    setOpen(!open);
  };

  return (
    <div className="flex">
      {open && (
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 self-start bg-surface lg:block">
          <Sidebar />
        </aside>
      )}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes natively; the click only dismisses via the backdrop */}
      <dialog
        ref={drawer}
        onClick={(e) => e.target === e.currentTarget && drawer.current?.close()}
        aria-label={t("chats")}
        className="drawer fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-fg backdrop:bg-black/40"
      >
        <Sidebar onNavigate={() => drawer.current?.close()} />
      </dialog>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between bg-bg pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t("chats")}
              aria-expanded={open}
              title={t("chats")}
              onClick={toggle}
              className={iconButton}
            >
              <PanelLeft className="size-4.5 rtl:-scale-x-100" aria-hidden />
            </button>
            <span className="font-semibold tracking-tight">Hiwar</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Shows the other language in its own script; lang keeps the
              screen-reader voice right, and the visible text is the name. */}
            <button
              type="button"
              lang={other}
              title={t("switchLanguage")}
              onClick={() => setLocale(other)}
              className="h-9 rounded-lg px-2.5 text-fg-muted text-sm transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {(other === "ar" ? ar : en).languageName}
            </button>
            <button
              type="button"
              aria-label={t("darkTheme")}
              aria-pressed={theme === "dark"}
              title={t("darkTheme")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={iconButton}
            >
              {theme === "dark" ? (
                <Moon className="size-4.5" aria-hidden />
              ) : (
                <Sun className="size-4.5" aria-hidden />
              )}
            </button>
            <Link
              to="/"
              aria-label={t("newChat")}
              title={t("newChat")}
              className={`${iconButton} ${open ? "lg:hidden" : ""}`}
            >
              <SquarePen className="size-4.5" aria-hidden />
            </Link>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
