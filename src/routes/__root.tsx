import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Header } from "../components/Header";
import { SettingsDialog } from "../features/settings/components/SettingsDialog";
import { Sidebar } from "../features/sidebar/components/Sidebar";
import { useT } from "../i18n";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});

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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const openSettings = () => {
    drawer.current?.close();
    setSettingsOpen(true);
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex">
      {open && (
        <aside className="shell-in sticky top-0 hidden h-dvh w-68 shrink-0 self-start border-line border-e bg-rail lg:block">
          <Sidebar onCollapse={toggle} onOpenSettings={openSettings} />
        </aside>
      )}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes natively; the click only dismisses via the backdrop */}
      <dialog
        ref={drawer}
        onClick={(e) => e.target === e.currentTarget && drawer.current?.close()}
        aria-label={t("chats")}
        className="drawer fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-rail p-0 text-fg backdrop:bg-black/40"
      >
        <Sidebar
          onNavigate={() => drawer.current?.close()}
          onOpenSettings={openSettings}
        />
      </dialog>
      <div className="relative isolate flex min-h-dvh min-w-0 flex-1 flex-col">
        <div aria-hidden className="aurora" />
        <Header sidebarOpen={open} onToggleSidebar={toggle} />
        {/* Keyed by path, so each new screen eases in on its own. */}
        <div key={pathname} className="page-in flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <div aria-hidden className="grain" />
    </div>
  );
}
