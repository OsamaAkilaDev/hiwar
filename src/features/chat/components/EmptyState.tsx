import { useState } from "react";
import { Mark } from "../../../components/Mark";
import { useT } from "../../../i18n";
import { bucketOf, withoutName } from "../../../lib/greeting";
import { usePrefs } from "../../../lib/prefs";

export function EmptyState() {
  const t = useT();
  const name = usePrefs((s) => s.name);
  // Index into the pooled list, picked once per mount so it doesn't flicker.
  const [roll] = useState(Math.random);

  const pool = [
    ...t("greetings.any").split("|"),
    ...t(`greetings.${bucketOf(new Date().getHours())}`).split("|"),
  ];
  const line = pool[Math.floor(roll * pool.length)] ?? "";

  return (
    <div className="enter flex flex-col items-center gap-4 [--i:0]">
      <Mark className="size-10 shrink-0" animate="draw" />
      <h1 className="text-center font-display font-medium text-3xl tracking-[-0.02em] sm:text-4xl [&:lang(ar)]:font-kufi [&:lang(ar)]:tracking-normal">
        {name ? line.replace("{name}", name) : withoutName(line)}
      </h1>
    </div>
  );
}
