import {
  BrainIcon,
  DatabaseIcon,
  PaletteIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useT } from "../../../i18n";
import { ar } from "../../../i18n/ar";
import { en } from "../../../i18n/en";
import { usePrefs } from "../../../lib/prefs";
import type { Accent, LocaleSetting, Theme } from "../../../lib/resolve-prefs";
import { useDeleteAllConversations } from "../hooks/useDeleteAllConversations";

type Tab = "appearance" | "data" | "memory";

const tabs = [
  { id: "appearance", Icon: PaletteIcon },
  { id: "data", Icon: DatabaseIcon },
  { id: "memory", Icon: BrainIcon },
] as const;

const swatches: { id: Accent; color: string }[] = [
  { id: "teal", color: "#7cd0c2" },
  { id: "saffron", color: "#f2b94b" },
];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-line border-t py-4 first:border-t-0">
      <div>
        <span className="block font-medium text-sm">{label}</span>
        {hint && <small className="text-subtle text-xs">{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; lang?: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset
      aria-label={label}
      className="inline-flex rounded-xl border border-line bg-bg p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          lang={o.lang}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className="h-7 rounded-[0.6rem] px-3 text-muted text-xs transition-colors hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg"
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [tab, setTab] = useState<Tab>("appearance");
  const [confirming, setConfirming] = useState(false);
  const {
    theme,
    accent,
    localeSetting,
    name,
    setTheme,
    setAccent,
    setLocale,
    setName,
  } = usePrefs();
  const deleteAll = useDeleteAllConversations();

  useEffect(() => {
    const el = dialog.current;
    if (!el || el.open === open) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  const themes: Theme[] = ["dark", "light", "system"];
  const locales: LocaleSetting[] = ["ar", "en", "auto"];

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes natively; the click only dismisses via the backdrop */}
      <dialog
        ref={dialog}
        onClose={onClose}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        aria-labelledby={titleId}
        className="modal m-auto max-h-[min(40rem,calc(100dvh-3rem))] w-[min(46rem,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-line bg-surface p-0 text-fg shadow-lift backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      >
        <div className="grid min-h-[26rem] sm:grid-cols-[11rem_minmax(0,1fr)]">
          <nav className="flex flex-col gap-0.5 border-line border-b p-3 sm:border-e sm:border-b-0">
            <div className="flex items-center justify-between">
              <h2 id={titleId} className="px-2.5 pt-1 pb-3 font-semibold">
                {t("settings")}
              </h2>
              <button
                type="button"
                aria-label={t("close")}
                title={t("close")}
                onClick={onClose}
                className="-mt-2 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:hidden"
              >
                <XIcon className="size-4.5" aria-hidden />
              </button>
            </div>
            <div className="flex gap-0.5 sm:flex-col">
              {tabs.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={tab === id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-2.5 rounded-[0.65rem] px-2.5 py-2 text-start text-muted text-sm transition-colors hover:text-fg aria-[current=true]:bg-surface-2 aria-[current=true]:text-fg"
                >
                  <Icon className="size-4.5" aria-hidden />
                  {t(`settings.${id}`)}
                </button>
              ))}
            </div>
          </nav>
          <section className="overflow-y-auto px-6 py-4">
            {tab === "appearance" && (
              <>
                <Row label={t("theme.label")} hint={t("theme.hint")}>
                  <Segmented
                    label={t("theme.label")}
                    value={theme}
                    options={themes.map((id) => ({
                      id,
                      label: t(`theme.${id}`),
                    }))}
                    onChange={setTheme}
                  />
                </Row>
                <Row label={t("accent.label")} hint={t("accent.hint")}>
                  <div className="flex gap-2">
                    {swatches.map(({ id, color }) => (
                      <button
                        key={id}
                        type="button"
                        aria-label={t(`accent.${id}`)}
                        title={t(`accent.${id}`)}
                        aria-pressed={accent === id}
                        onClick={() => setAccent(id)}
                        style={{ background: color }}
                        className="size-6.5 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] aria-pressed:outline-2 aria-pressed:outline-fg aria-pressed:outline-offset-2"
                      />
                    ))}
                  </div>
                </Row>
                <Row label={t("language.label")} hint={t("language.hint")}>
                  <Segmented
                    label={t("language.label")}
                    value={localeSetting}
                    options={locales.map((id) =>
                      id === "auto"
                        ? { id, label: t("language.auto") }
                        : {
                            id,
                            label: (id === "ar" ? ar : en).languageName,
                            lang: id,
                          },
                    )}
                    onChange={setLocale}
                  />
                </Row>
                <div className="border-line border-t py-4">
                  <label htmlFor="name" className="block font-medium text-sm">
                    {t("name.label")}
                  </label>
                  <small className="text-subtle text-xs">
                    {t("name.hint")}
                  </small>
                  <input
                    id="name"
                    defaultValue={name}
                    maxLength={40}
                    autoComplete="off"
                    onBlur={(e) => setName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && e.currentTarget.blur()
                    }
                    className="mt-2 block h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
                  />
                </div>
              </>
            )}
            {tab === "data" && (
              <Row label={t("data.deleteAll")}>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="h-8 rounded-lg border border-danger px-3 text-danger text-sm transition-colors hover:bg-danger/10"
                >
                  {t("data.deleteAll")}
                </button>
              </Row>
            )}
            {tab === "data" && deleteAll.isError && (
              <p role="alert" className="text-danger text-sm">
                {t("error.deleteAll")}
              </p>
            )}
            {tab === "memory" && (
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <span className="font-medium text-sm">
                    {t("memory.title")}
                  </span>
                  <span className="ms-2 rounded-md border border-accent/40 px-1.5 py-0.5 font-mono text-[0.65rem] text-accent-text uppercase">
                    {t("soon")}
                  </span>
                  <p className="mt-0.5 text-subtle text-xs">
                    {t("memory.body")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  aria-label={t("memory.title")}
                  disabled
                  className="relative h-6 w-10 shrink-0 rounded-full border border-line bg-surface-2 opacity-60 after:absolute after:start-0.5 after:top-0.5 after:size-4.5 after:rounded-full after:bg-muted after:content-['']"
                />
              </div>
            )}
          </section>
        </div>
      </dialog>
      <ConfirmDialog
        heading={t("data.deleteAllTitle")}
        body={t("data.deleteAllBody")}
        confirmLabel={t("data.deleteAll")}
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          deleteAll.mutate();
          navigate({ to: "/" });
          onClose();
        }}
      />
    </>
  );
}
