import { useState } from "react";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
import { usePrefs } from "../../../lib/prefs";

const variants = ["back", "mind", "welcome"] as const;
type Variant = (typeof variants)[number] | "morning" | "afternoon" | "evening";

const pick = (): Variant => {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const pool: Variant[] = [...variants, time];
  return pool[Math.floor(Math.random() * pool.length)] ?? "back";
};

export function EmptyState() {
  const t = useT();
  const name = usePrefs((s) => s.name);
  const [variant] = useState(pick);

  return (
    <div className="enter flex items-center justify-center gap-3.5 [--i:0]">
      <Mark className="size-9 shrink-0" animate="draw" />
      <h1 className="text-center font-display font-medium text-3xl tracking-[-0.02em] sm:text-4xl [&:lang(ar)]:font-kufi [&:lang(ar)]:tracking-normal">
        {name
          ? t(`greeting.${variant}.named`, { name })
          : t(`greeting.${variant}`)}
      </h1>
    </div>
  );
}
