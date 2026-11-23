import {
  BugIcon,
  CalendarCheckIcon,
  type Icon,
  PencilSimpleLineIcon,
  ScalesIcon,
} from "@phosphor-icons/react";
import { useT } from "../../../i18n";
import { ar } from "../../../i18n/ar";
import { en } from "../../../i18n/en";
import { usePrefs } from "../../../lib/prefs";

const ideas: { id: "error" | "message" | "compare" | "plan"; Icon: Icon }[] = [
  { id: "error", Icon: BugIcon },
  { id: "message", Icon: PencilSimpleLineIcon },
  { id: "compare", Icon: ScalesIcon },
  { id: "plan", Icon: CalendarCheckIcon },
];

const greetingKey = () => {
  const hour = new Date().getHours();
  return hour < 12
    ? "greeting.morning"
    : hour < 18
      ? "greeting.afternoon"
      : "greeting.evening";
};

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const t = useT();
  const locale = usePrefs((s) => s.locale);
  const key = greetingKey();
  // The greeting appears in both languages: the UI's first, the other under it.
  const second = locale === "ar" ? "en" : "ar";

  return (
    <div className="pt-[10vh]">
      <h1 className="font-display font-semibold text-[clamp(2.1rem,4.6vw,3.2rem)] leading-[1.1] tracking-[-0.035em] [&:lang(ar)]:tracking-normal">
        {t(key)}
        <span
          lang={second}
          className={`mt-2.5 block text-[0.78em] text-accent-text leading-[1.4] tracking-normal ${second === "ar" ? "font-bold font-kufi" : "font-semibold font-display"}`}
        >
          {(second === "ar" ? ar : en)[key]}
        </span>
      </h1>
      <p className="mt-3.5 max-w-[46ch] text-muted">{t("emptySub")}</p>
      <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
        {ideas.map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(t(`idea.${id}.prompt`))}
            className="rounded-2xl border border-line bg-surface p-4 text-start transition-[border-color,transform] hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--line))] motion-safe:hover:-translate-y-px"
          >
            <Icon className="size-5 text-accent-text" aria-hidden />
            <b className="mt-2.5 block font-medium text-sm">
              {t(`idea.${id}.title`)}
            </b>
            <span className="mt-0.5 block text-subtle text-sm">
              {t(`idea.${id}.hint`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
