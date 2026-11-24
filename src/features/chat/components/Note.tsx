import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useT } from "../../../i18n";
import { usePrefs } from "../../../lib/prefs";

export function Note({
  tone,
  children,
}: {
  tone?: "danger";
  children: ReactNode;
}) {
  const locale = usePrefs((s) => s.locale);
  return (
    <p
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      role={tone === "danger" ? "alert" : undefined}
      className={`mt-2 flex w-fit flex-wrap items-center gap-x-3 gap-y-1 text-sm [&:lang(ar)]:leading-[1.85] ${tone === "danger" ? "text-danger" : "text-subtle"}`}
    >
      {children}
    </p>
  );
}

export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const t = useT();
  if (!onRetry) return null;
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 -my-1 whitespace-nowrap rounded-md px-2 py-2 text-accent-text hover:bg-surface-2"
    >
      <ArrowClockwiseIcon className="size-3.5" aria-hidden />
      {t("retry")}
    </button>
  );
}
