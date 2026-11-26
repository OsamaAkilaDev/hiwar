// Renders one visual fence (chart, plot, mermaid, …) by its tag; heavy
// renderers load lazily, and anything invalid shows as plain code.
import {
  ArrowsClockwiseIcon,
  CalendarDotsIcon,
  ChartBarIcon,
  CodeIcon,
  ColumnsIcon,
  FunctionIcon,
  GraphIcon,
  ListNumbersIcon,
  ScalesIcon,
  TreeStructureIcon,
  TreeViewIcon,
} from "@phosphor-icons/react";
import { lazy, memo, type ReactNode, Suspense, useState } from "react";
import { useT } from "../../../i18n";
import { Compare, Cycle, ProsCons, Timeline, Tree } from "./Blocks";
import { Chart } from "./Chart";
import { Diagram } from "./Diagram";
import { Frame } from "./Frame";
import { layoutPlot, Plot } from "./Plot";
import { SandboxFrame } from "./SandboxFrame";
import { Stepper } from "./Stepper";
import {
  ChartSpec,
  CompareSpec,
  CycleSpec,
  PlotSpec,
  ProsConsSpec,
  parseSpec,
  StepperSpec,
  TimelineSpec,
  TreeSpec,
  type VisualLang,
} from "./spec";

// Renderers are heavy (Mermaid ~0.5 MB): each loads the first time a reply
// uses it. Module-level, so the reference is stable across renders.
const loadMermaid = () => import("./mermaid").then((m) => m.render);
const loadGraphviz = () => import("./graphviz").then((m) => m.render);
const Markmap = lazy(() => import("./Markmap"));

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
  plot: FunctionIcon,
  mermaid: TreeStructureIcon,
  dot: GraphIcon,
  markmap: TreeViewIcon,
  stepper: ListNumbersIcon,
  timeline: CalendarDotsIcon,
  compare: ColumnsIcon,
  cycle: ArrowsClockwiseIcon,
  tree: TreeStructureIcon,
  proscons: ScalesIcon,
  html: CodeIcon,
};

// Height each placeholder reserves, close to the finished visual, so the
// text below doesn't jump when the block closes.
const HEIGHTS = {
  chart: "h-72",
  plot: "h-96",
  mermaid: "h-80",
  dot: "h-80",
  markmap: "h-80",
  stepper: "h-56",
  timeline: "h-64",
  compare: "h-56",
  cycle: "h-96",
  tree: "h-56",
  proscons: "h-48",
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
    if (lang === "plot") {
      const spec = parseSpec(PlotSpec, code);
      const layout = spec && layoutPlot(spec);
      if (!spec || !layout) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Plot spec={spec} layout={layout} />
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
    if (lang === "timeline") {
      const spec = parseSpec(TimelineSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Timeline spec={spec} />
        </Frame>
      );
    }
    if (lang === "compare") {
      const spec = parseSpec(CompareSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Compare spec={spec} />
        </Frame>
      );
    }
    if (lang === "cycle") {
      const spec = parseSpec(CycleSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Cycle spec={spec} dir={dir} />
        </Frame>
      );
    }
    if (lang === "tree") {
      const spec = parseSpec(TreeSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <Tree spec={spec} />
        </Frame>
      );
    }
    if (lang === "proscons") {
      const spec = parseSpec(ProsConsSpec, code);
      if (!spec) return fallback();
      return (
        <Frame title={spec.title} dir={dir}>
          <ProsCons spec={spec} />
        </Frame>
      );
    }
    if (lang === "mermaid") {
      return (
        <Diagram
          code={code}
          name="diagram"
          dir={dir}
          load={loadMermaid}
          placeholder={<Placeholder lang="mermaid" />}
          fallback={fallback}
        />
      );
    }
    if (lang === "dot") {
      return (
        <Diagram
          code={code}
          name="graph"
          dir={dir}
          load={loadGraphviz}
          placeholder={<Placeholder lang="dot" />}
          fallback={fallback}
        />
      );
    }
    if (lang === "markmap") {
      return (
        <Suspense fallback={<Placeholder lang="markmap" />}>
          <Markmap code={code} dir={dir} fallback={fallback} />
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
