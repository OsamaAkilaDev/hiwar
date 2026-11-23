import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Moon, SquarePen, Sun } from "lucide-react";
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

function Root() {
  const t = useT();
  const { locale, theme, setLocale, setTheme } = usePrefs();
  const other = locale === "ar" ? "en" : "ar";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between bg-bg pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <span className="font-semibold tracking-tight">Hiwar</span>
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
            className={iconButton}
          >
            <SquarePen className="size-4.5" aria-hidden />
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
