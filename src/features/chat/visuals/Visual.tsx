import {
  ChartBarIcon,
  CodeIcon,
  ListNumbersIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import { lazy, memo, type ReactNode, Suspense, useState } from "react";
import { useT } from "../../../i18n";
import { Chart } from "./Chart";
import { Frame } from "./Frame";
import { SandboxFrame } from "./SandboxFrame";
import { Stepper } from "./Stepper";
import { ChartSpec, parseSpec, StepperSpec, type VisualLang } from "./spec";

// Mermaid is ~0.5 MB: it loads the first time a reply draws a diagram.
const Mermaid = lazy(() => import("./Mermaid"));

type Props = {
  lang: VisualLang;
  code: string;
  closed: boolean;
  dir: "rtl" | "ltr";
  /** The block as plain code, used while invalid or unsupported. */
  fallback: () => ReactNode;
};

const ICONS = {
  chart: ChartBarIcon,
  mermaid: TreeStructureIcon,
  stepper: ListNumbersIcon,
  html: CodeIcon,
};

// Height each placeholder reserves, close to the finished visual, so the
// text below doesn't jump when the block closes.
const HEIGHTS = {
  chart: "h-72",
  mermaid: "h-80",
  stepper: "h-56",
  html: "h-56",
};

function Placeholder({ lang }: { lang: VisualLang }) {
  const t = useT();
  const Icon = ICONS[lang];
  return (
    <div
      className={`visual-placeholder grid place-items-center ${HEIGHTS[lang]}`}
    >
      <span className="flex items-center gap-2 text-subtle text-sm">
        <Icon className="size-4 animate-pulse" aria-hidden />
        {t(`visual.drawing.${lang}`)}
      </span>
    </div>
  );
}

function SourceToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      className="shrink-0 rounded-md px-2 py-1 text-subtle text-xs hover:bg-surface-2 hover:text-fg"
    >
      {t(open ? "visual.hideSource" : "visual.showSource")}
    </button>
  );
}

export const Visual = memo(
  function Visual({ lang, code, closed, dir, fallback }: Props) {
    const t = useT();
    const [source, setSource] = useState(false);
    if (!closed) return <Placeholder lang={lang} />;

    if (lang === "chart") {
      const spec = parseSpec(ChartSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} unit={spec.unit} dir={dir}>
          <Chart spec={spec} lang={dir === "rtl" ? "ar" : "en"} />
        </Frame>
      );
    }
    if (lang === "stepper") {
      const spec = parseSpec(StepperSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Stepper spec={spec} />
        </Frame>
      );
    }
    if (lang === "mermaid") {
      return (
        <Suspense fallback={<Placeholder lang="mermaid" />}>
          <Frame
            dir={dir}
            action={
              <SourceToggle open={source} onToggle={() => setSource(!source)} />
            }
          >
            {source ? (
              fallback()
            ) : (
              <Mermaid code={code} fallback={fallback()} />
            )}
          </Frame>
        </Suspense>
      );
    }
    return (
      <Frame
        dir={dir}
        action={
          <SourceToggle open={source} onToggle={() => setSource(!source)} />
        }
      >
        {source ? (
          fallback()
        ) : (
          <SandboxFrame code={code} title={t("visual.html")} />
        )}
      </Frame>
    );
  },
  // `fallback` is a fresh closure each render; the block itself is what matters.
  (a, b) =>
    a.code === b.code &&
    a.closed === b.closed &&
    a.lang === b.lang &&
    a.dir === b.dir,
);
