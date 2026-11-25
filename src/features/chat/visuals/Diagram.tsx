import {
  ArrowsInIcon,
  ArrowsOutIcon,
  CodeIcon,
  DownloadSimpleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useT } from "../../../i18n";
import { CopyButton } from "../components/CopyButton";
import { Frame } from "./Frame";
import { useThemeKey } from "./theme-key";

/** Turns diagram source into SVG markup; null when the source is invalid. */
export type Renderer = (code: string, id: string) => Promise<string | null>;

const iconButton =
  "grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg";

export function downloadSvg(svg: string, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  Object.assign(document.createElement("a"), {
    href: url,
    download: `hiwar-${name}.svg`,
  }).click();
  URL.revokeObjectURL(url);
}

/** Source toggle, copy, download and full screen: the same for every diagram. */
export function Toolbar({
  code,
  source,
  onSource,
  onDownload,
  onExpand,
}: {
  code: string;
  source: boolean;
  onSource: () => void;
  onDownload: () => void;
  onExpand: () => void;
}) {
  const t = useT();
  const button = (label: string, onClick: () => void, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={iconButton}
    >
      {icon}
    </button>
  );
  return (
    <div className="-my-1 flex items-center gap-0.5">
      <button
        type="button"
        aria-label={t("visual.source")}
        title={t("visual.source")}
        aria-pressed={source}
        onClick={onSource}
        className={iconButton}
      >
        <CodeIcon className="size-4" aria-hidden />
      </button>
      <CopyButton text={code} label="copyCode" className="size-7 rounded-md" />
      {button(
        t("visual.download"),
        onDownload,
        <DownloadSimpleIcon className="size-4" aria-hidden />,
      )}
      {button(
        t("visual.expand"),
        onExpand,
        <ArrowsOutIcon className="size-4" aria-hidden />,
      )}
    </div>
  );
}

export function StageButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
    >
      {children}
    </button>
  );
}

/** Full-screen modal; `controls` float at the top corner beside Close. */
export function Fullscreen({
  open,
  onClose,
  controls,
  children,
}: {
  open: boolean;
  onClose: () => void;
  controls?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el || el.open === open) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label={t("visual.expand")}
      className="modal m-auto h-[calc(100dvh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/50"
    >
      {open ? children : null}
      <div className="absolute end-3 top-3 flex items-center gap-0.5 rounded-xl border border-line bg-glass p-1 shadow-lift backdrop-blur-[18px]">
        {controls}
        <StageButton label={t("close")} onClick={onClose}>
          <XIcon className="size-4.5" aria-hidden />
        </StageButton>
      </div>
    </dialog>
  );
}

// Shared shell for every diagram language that renders to an SVG string
// (Mermaid, Graphviz): the inline card, and a full-screen view that zooms
// and pans.
export function Diagram({
  code,
  name,
  dir,
  load,
  placeholder,
  fallback,
}: {
  code: string;
  /** Used for the downloaded file's name. */
  name: string;
  dir: "rtl" | "ltr";
  /** Loads the renderer on first use, so its weight stays out of the app. */
  load: () => Promise<Renderer>;
  placeholder: ReactNode;
  fallback: () => ReactNode;
}) {
  const t = useT();
  const id = `d${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const theme = useThemeKey();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((render) => render(code, `${id}-${theme}`))
      .then((out) => {
        if (!alive) return;
        if (out) setSvg(out);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [code, id, theme, load]);

  if (failed) return <>{fallback()}</>;
  if (!svg) return <>{placeholder}</>;

  return (
    <Frame
      dir={dir}
      action={
        <Toolbar
          code={code}
          source={source}
          onSource={() => setSource(!source)}
          onDownload={() => downloadSvg(svg, name)}
          onExpand={() => setExpanded(true)}
        />
      }
    >
      {source ? (
        fallback()
      ) : (
        <button
          type="button"
          aria-label={t("visual.expand")}
          onClick={() => setExpanded(true)}
          className="diagram-svg block w-full cursor-zoom-in"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: renderer output, sanitized (Mermaid strict mode, DOMPurify for Graphviz)
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <PanZoom svg={svg} open={expanded} onClose={() => setExpanded(false)} />
    </Frame>
  );
}

const MIN = 0.25;
const MAX = 8;
const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));

function PanZoom({
  svg,
  open,
  onClose,
}: {
  svg: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) setView({ s: 1, x: 0, y: 0 });
  }, [open]);

  // Zoom toward a point given relative to the stage's centre.
  const zoomAt = (factor: number, px = 0, py = 0) =>
    setView((v) => {
      const s = clamp(v.s * factor);
      const f = s / v.s;
      return { s, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  // biome-ignore lint/correctness/useExhaustiveDependencies: zoomAt only calls setView
  useEffect(() => {
    const el = stage.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(
        Math.exp(-e.deltaY * 0.0015),
        e.clientX - r.left - r.width / 2,
        e.clientY - r.top - r.height / 2,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  return (
    <Fullscreen
      open={open}
      onClose={onClose}
      controls={
        <>
          <StageButton label={t("visual.zoomOut")} onClick={() => zoomAt(0.8)}>
            <MagnifyingGlassMinusIcon className="size-4.5" aria-hidden />
          </StageButton>
          <StageButton label={t("visual.zoomIn")} onClick={() => zoomAt(1.25)}>
            <MagnifyingGlassPlusIcon className="size-4.5" aria-hidden />
          </StageButton>
          <StageButton
            label={t("visual.fit")}
            onClick={() => setView({ s: 1, x: 0, y: 0 })}
          >
            <ArrowsInIcon className="size-4.5" aria-hidden />
          </StageButton>
        </>
      }
    >
      <div
        ref={stage}
        className="diagram-stage relative size-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const from = drag.current;
          if (!from) return;
          drag.current = { x: e.clientX, y: e.clientY };
          setView((v) => ({
            ...v,
            x: v.x + e.clientX - from.x,
            y: v.y + e.clientY - from.y,
          }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div
          className="absolute inset-0 p-12"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
          }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the same sanitized SVG shown inline
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </Fullscreen>
  );
}
