import { InfoIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutationState } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { FactDTO, MemoryDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";
import { dirProps } from "../../../lib/dir";
import { usePrefs } from "../../../lib/prefs";
import { queryKeys } from "../../../lib/query-keys";
import {
  useDeleteFact,
  useDeleteMemory,
  useMemory,
  useUpdateFact,
} from "../hooks/useMemory";
import { humanizeKey } from "../humanize";

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function relative(iso: string, locale: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? [
    "minute",
    60,
  ];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(seconds / size),
    unit,
  );
}

function Heading({ children }: { children: string }) {
  return (
    <h3 className="border-line border-t pt-4 pb-1 font-medium text-sm">
      {children}
    </h3>
  );
}

function FactRow({ fact }: { fact: FactDTO }) {
  const t = useT();
  const update = useUpdateFact();
  const remove = useDeleteFact();
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);
  const label = humanizeKey(fact.key);

  const save = (value: string) => {
    const next = value.trim();
    setEditing(false);
    if (!cancelled.current && next && next !== fact.value)
      update.mutate({ id: fact.id, value: next });
  };

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <small className="block text-subtle text-xs">{label}</small>
        {editing ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: the user just asked to edit this value
            autoFocus
            defaultValue={fact.value}
            aria-label={`${t("memory.editFact")}: ${label}`}
            maxLength={200}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => save(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Escape") cancelled.current = true;
              if (e.key === "Enter" || e.key === "Escape")
                e.currentTarget.blur();
            }}
            className="mt-0.5 h-[34px] w-full rounded-[0.65rem] border border-line bg-bg px-3 py-1.5 text-[0.9rem] text-fg outline-none focus:border-accent"
          />
        ) : (
          <button
            type="button"
            {...dirProps(fact.value)}
            aria-label={`${t("memory.editFact")}: ${label}`}
            onClick={() => {
              cancelled.current = false;
              setEditing(true);
            }}
            className="block w-full break-words rounded-lg text-start text-sm hover:text-accent-text"
          >
            {fact.value}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={`${t("memory.deleteFact")}: ${label}`}
        title={t("memory.deleteFact")}
        onClick={() => remove.mutate(fact.id)}
        className={iconButton}
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function MemoryRow({ memory }: { memory: MemoryDTO }) {
  const t = useT();
  const locale = usePrefs((s) => s.locale);
  const remove = useDeleteMemory();
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p {...dirProps(memory.content)} className="break-words text-sm">
          {memory.content}
        </p>
        <small className="text-subtle text-xs">
          {relative(memory.createdAt, locale)}
        </small>
      </div>
      <button
        type="button"
        aria-label={t("memory.deleteMemory")}
        title={t("memory.deleteMemory")}
        onClick={() => remove.mutate(memory.id)}
        className={iconButton}
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </li>
  );
}

export function MemoryPanel({ onForget }: { onForget: () => void }) {
  const t = useT();
  const { memory: on, setMemory } = usePrefs();
  const { data } = useMemory();
  // Rows unmount on optimistic delete, so read the latest memory mutation globally.
  const failed =
    useMutationState({
      filters: { mutationKey: queryKeys.memory() },
      select: (m) => m.state.status,
    }).at(-1) === "error";
  const facts = data?.facts ?? [];
  const memories = data?.memories ?? [];
  const empty = data && !facts.length && !memories.length;

  return (
    <>
      <div className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-medium text-sm">{t("memory.use")}</span>
            <small className="text-subtle text-xs">{t("memory.useHint")}</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("memory.use")}
            onClick={() => setMemory(!on)}
            className="relative h-6 w-10 shrink-0 rounded-full border border-line bg-surface-2 transition-colors after:absolute after:start-0.5 after:top-0.5 after:size-4.5 after:rounded-full after:bg-muted after:transition-[translate] after:content-[''] aria-checked:border-accent aria-checked:bg-accent/20 aria-checked:after:translate-x-4 aria-checked:after:bg-accent rtl:aria-checked:after:-translate-x-4"
          />
        </div>
        <p className="mt-2 flex gap-1.5 text-subtle text-xs">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("memory.privacy")}
        </p>
      </div>
      {!on && <p className="pb-2 text-muted text-xs">{t("memory.off")}</p>}
      <div className={on ? "" : "opacity-60"}>
        {empty && (
          <p className="border-line border-t py-4 text-subtle text-sm">
            {t("memory.empty")}
          </p>
        )}
        {facts.length > 0 && (
          <>
            <Heading>{t("memory.about")}</Heading>
            <ul>
              {facts.map((f) => (
                <FactRow key={f.id} fact={f} />
              ))}
            </ul>
          </>
        )}
        {memories.length > 0 && (
          <>
            <Heading>{t("memory.memories")}</Heading>
            <ul className="max-h-64 overflow-y-auto overscroll-contain">
              {memories.map((m) => (
                <MemoryRow key={m.id} memory={m} />
              ))}
            </ul>
          </>
        )}
      </div>
      {failed && (
        <p role="alert" className="pt-2 text-danger text-sm">
          {t("error.memory")}
        </p>
      )}
      {!empty && (
        <div className="border-line border-t pt-4">
          <button
            type="button"
            onClick={onForget}
            className="h-8 rounded-lg border border-danger px-3 text-danger text-sm hover:bg-danger/10"
          >
            {t("memory.forget")}
          </button>
        </div>
      )}
    </>
  );
}
