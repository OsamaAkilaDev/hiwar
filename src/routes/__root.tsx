import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { SquarePen } from "lucide-react";
import { useT } from "../i18n";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});

function Root() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-bg px-4">
        <span className="font-semibold tracking-tight">Hiwar</span>
        <Link
          to="/"
          aria-label={t("newChat")}
          title={t("newChat")}
          className="grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <SquarePen className="size-4.5" aria-hidden />
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
