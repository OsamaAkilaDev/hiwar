import { useId } from "react";
import { compile } from "./expr";
import type { PlotSpec } from "./spec";

// A square graph of functions of x, axes through the origin: how a function
// is drawn on paper, not stretched edge to edge like a data chart.

const M = 6; // margin inside the 100×100 view box
const N = 400; // samples per function
const SPAN = 100 - 2 * M;

// Each line differs by dash as well as colour, so they read without colour.
const STYLES = [
  { color: "var(--accent)", dash: undefined },
  { color: "var(--fg)", dash: "6 4" },
  { color: "var(--muted)", dash: "2 3" },
  { color: "var(--accent)", dash: "8 3 2 3" },
];

/** A 1/2/5 × 10ⁿ step giving about six ticks across the range. */
function niceStep(span: number) {
  const raw = span / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

function ticks([lo, hi]: [number, number]) {
  const step = niceStep(hi - lo);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step / 1e6; v += step)
    out.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return out;
}

const fmt = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** Everything the SVG draws, in view-box units; null if any expression is
 * invalid (the block then shows as code). */
export function layoutPlot(spec: PlotSpec) {
  let fns: ((x: number) => number)[];
  try {
    fns = spec.functions.map((f) => compile(f.expr));
  } catch {
    return null;
  }
  const [x0, x1] = spec.x ?? [-10, 10];
  const xs = Array.from({ length: N + 1 }, (_, i) => x0 + ((x1 - x0) * i) / N);
  const series = fns.map((fn) => xs.map((x) => fn(x)));

  let y: [number, number];
  if (spec.y) y = spec.y;
  else {
    // Ignore the extreme 2% each side, so asymptotes don't flatten the rest.
    const all = series
      .flat()
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!all.length) return null;
    let lo = Math.min(all[Math.floor(all.length * 0.02)] ?? 0, 0);
    let hi = Math.max(all[Math.ceil(all.length * 0.98) - 1] ?? 0, 0);
    if (hi - lo < 1e-9) [lo, hi] = [lo - 1, hi + 1];
    const pad = (hi - lo) * 0.08;
    y = [lo - (lo < 0 ? pad : 0), hi + (hi > 0 ? pad : 0)];
  }
  const [y0, y1] = y;
  const sx = (v: number) => M + ((v - x0) / (x1 - x0)) * SPAN;
  const sy = (v: number) => 100 - M - ((v - y0) / (y1 - y0)) * SPAN;

  const paths = series.map((ys) => {
    let d = "";
    let prev: number | null = null;
    ys.forEach((v, i) => {
      const py = sy(v);
      // Break at gaps and asymptotes (a jump of more than the whole height).
      const ok = Number.isFinite(py) && Math.abs(py) < 1e4;
      if (!ok) {
        prev = null;
        return;
      }
      const jump = prev !== null && Math.abs(py - prev) > SPAN;
      d += `${prev === null || jump ? "M" : "L"}${sx(xs[i] as number).toFixed(2)} ${py.toFixed(2)}`;
      prev = py;
    });
    return d;
  });

  return {
    paths,
    // Axes sit at zero when it is in range, else on the nearest edge.
    axisX: sy(Math.min(Math.max(0, y0), y1)),
    axisY: sx(Math.min(Math.max(0, x0), x1)),
    xTicks: ticks([x0, x1]).map((v) => ({ v, at: sx(v) })),
    yTicks: ticks([y0, y1]).map((v) => ({ v, at: sy(v) })),
  };
}

export function Plot({
  spec,
  layout,
}: {
  spec: PlotSpec;
  layout: NonNullable<ReturnType<typeof layoutPlot>>;
}) {
  const clip = `plot${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { paths, axisX, axisY, xTicks, yTicks } = layout;
  const labelled = spec.functions.length > 1 || spec.functions[0]?.label;
  const line = { vectorEffect: "non-scaling-stroke" } as const;

  return (
    <div dir="ltr" className="mx-auto w-full max-w-[26rem]">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={spec.functions.map((f) => f.label ?? f.expr).join(", ")}
        className="block aspect-square w-full overflow-visible"
      >
        <defs>
          <clipPath id={clip}>
            <rect x={M} y={M} width={SPAN} height={SPAN} />
          </clipPath>
        </defs>
        {/* Grid */}
        <g stroke="var(--line)" strokeWidth={1} style={line}>
          {xTicks.map((t) => (
            <line
              key={`x${t.v}`}
              x1={t.at}
              x2={t.at}
              y1={M}
              y2={100 - M}
              style={line}
            />
          ))}
          {yTicks.map((t) => (
            <line
              key={`y${t.v}`}
              y1={t.at}
              y2={t.at}
              x1={M}
              x2={100 - M}
              style={line}
            />
          ))}
        </g>
        {/* Axes */}
        <g stroke="var(--subtle)" strokeWidth={1.25}>
          <line x1={M} x2={100 - M} y1={axisX} y2={axisX} style={line} />
          <line y1={M} y2={100 - M} x1={axisY} x2={axisY} style={line} />
        </g>
        {/* Tick labels, beside the axes; zero once at the origin. */}
        <g className="fill-subtle font-mono" fontSize={2.9}>
          {xTicks
            .filter((t) => t.v !== 0)
            .map((t) => (
              <text
                key={`lx${t.v}`}
                x={t.at}
                y={Math.min(axisX + 4, 100 - M + 4)}
                textAnchor="middle"
              >
                {fmt.format(t.v)}
              </text>
            ))}
          {yTicks
            .filter((t) => t.v !== 0)
            .map((t) => (
              <text
                key={`ly${t.v}`}
                x={Math.max(axisY - 1.5, M - 1.5)}
                y={t.at + 1}
                textAnchor="end"
              >
                {fmt.format(t.v)}
              </text>
            ))}
          <text x={axisY - 1.5} y={axisX + 4} textAnchor="end">
            0
          </text>
        </g>
        {/* Curves */}
        <g clipPath={`url(#${clip})`} fill="none" className="chart-wipe">
          {paths.map((d, i) => {
            const s = STYLES[i % STYLES.length] ?? STYLES[0];
            return (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: one path per function, in order
                key={i}
                d={d}
                stroke={s?.color}
                strokeWidth={2.25}
                strokeDasharray={s?.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={line}
              />
            );
          })}
        </g>
      </svg>
      {labelled ? (
        <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm">
          {spec.functions.map((f, i) => {
            const s = STYLES[i % STYLES.length] ?? STYLES[0];
            return (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: one entry per function
                key={i}
                className="flex items-center gap-2"
              >
                <svg width="20" height="4" aria-hidden className="shrink-0">
                  <line
                    x1="1"
                    x2="19"
                    y1="2"
                    y2="2"
                    stroke={s?.color}
                    strokeWidth="2"
                    strokeDasharray={s?.dash}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-mono text-muted text-xs">
                  {f.label ?? f.expr}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
