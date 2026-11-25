import { useEffect, useId, useRef, useState } from "react";
import { compile } from "./expr";
import type { PlotSpec } from "./spec";

// A graph of functions of x, axes through the origin, drawn in real pixels:
// it fills the card's width, and its height stops at MAX_H, so it is square
// on a phone and wide on a desktop. Labels stay 11px at any size.

const N = 400; // samples per function
const MAX_H = 360;
// Room for tick labels when an axis sits on the edge.
const PAD = { top: 10, right: 14, bottom: 24, left: 38 };

// Each line differs by dash as well as colour, so they read without colour.
const STYLES = [
  { color: "var(--accent)", dash: undefined },
  { color: "var(--fg)", dash: "6 4" },
  { color: "var(--muted)", dash: "2 3" },
  { color: "var(--accent)", dash: "8 3 2 3" },
];

/** A 1/2/5 × 10ⁿ step giving about `count` ticks across the range. */
function niceStep(span: number, count: number) {
  const raw = span / Math.max(2, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

function ticks([lo, hi]: [number, number], count: number) {
  const step = niceStep(hi - lo, count);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step / 1e6; v += step)
    out.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return out;
}

const fmt = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** The sampled functions and their ranges; null if any expression is
 * invalid (the block then shows as code). */
export function layoutPlot(spec: PlotSpec) {
  let fns: ((x: number) => number)[];
  try {
    fns = spec.functions.map((f) => compile(f.expr));
  } catch {
    return null;
  }
  const x: [number, number] = spec.x ?? [-10, 10];
  const xs = Array.from(
    { length: N + 1 },
    (_, i) => x[0] + ((x[1] - x[0]) * i) / N,
  );
  const series = fns.map((fn) => xs.map((v) => fn(v)));

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
  return { xs, series, x, y };
}

type Sampled = NonNullable<ReturnType<typeof layoutPlot>>;

/** Pixel geometry for a box of w × h. */
function geometry({ xs, series, x, y }: Sampled, w: number, h: number) {
  const [x0, x1] = x;
  const [y0, y1] = y;
  const right = w - PAD.right;
  const bottom = h - PAD.bottom;
  const sx = (v: number) =>
    PAD.left + ((v - x0) / (x1 - x0)) * (right - PAD.left);
  const sy = (v: number) =>
    bottom - ((v - y0) / (y1 - y0)) * (bottom - PAD.top);
  const height = bottom - PAD.top;

  const paths = series.map((ys) => {
    let d = "";
    let prev: number | null = null;
    ys.forEach((v, i) => {
      const py = sy(v);
      // Break at gaps and asymptotes (a jump of more than the whole height).
      if (!Number.isFinite(py) || Math.abs(py) > 1e5) {
        prev = null;
        return;
      }
      const jump = prev !== null && Math.abs(py - prev) > height;
      d += `${prev === null || jump ? "M" : "L"}${sx(xs[i] as number).toFixed(1)} ${py.toFixed(1)}`;
      prev = py;
    });
    return d;
  });

  return {
    paths,
    right,
    bottom,
    // Axes sit at zero when it is in range, else on the nearest edge.
    axisX: sy(Math.min(Math.max(0, y0), y1)),
    axisY: sx(Math.min(Math.max(0, x0), x1)),
    xTicks: ticks(x, (right - PAD.left) / 72).map((v) => ({ v, at: sx(v) })),
    yTicks: ticks(y, height / 44).map((v) => ({ v, at: sy(v) })),
  };
}

export function Plot({ spec, layout }: { spec: PlotSpec; layout: Sampled }) {
  const clip = `plot${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setW(Math.round(entry?.contentRect.width ?? 0)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const h = Math.min(w, MAX_H);
  const labelled = spec.functions.length > 1 || spec.functions[0]?.label;

  return (
    <div ref={box} dir="ltr" className="w-full">
      {w ? (
        <PlotSvg
          spec={spec}
          g={geometry(layout, w, h)}
          w={w}
          h={h}
          clip={clip}
        />
      ) : (
        <div style={{ height: MAX_H }} />
      )}
      {labelled ? <Legend spec={spec} /> : null}
    </div>
  );
}

function PlotSvg({
  spec,
  g,
  w,
  h,
  clip,
}: {
  spec: PlotSpec;
  g: ReturnType<typeof geometry>;
  w: number;
  h: number;
  clip: string;
}) {
  const { paths, axisX, axisY, xTicks, yTicks, right, bottom } = g;
  const T = PAD.top;
  const L = PAD.left;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={spec.functions.map((f) => f.label ?? f.expr).join(", ")}
      className="block overflow-visible"
    >
      <defs>
        <clipPath id={clip}>
          <rect x={L} y={T} width={right - L} height={bottom - T} />
        </clipPath>
      </defs>
      {/* Grid */}
      <g stroke="var(--line)" strokeWidth={1}>
        {xTicks.map((t) => (
          <line key={`x${t.v}`} x1={t.at} x2={t.at} y1={T} y2={bottom} />
        ))}
        {yTicks.map((t) => (
          <line key={`y${t.v}`} y1={t.at} y2={t.at} x1={L} x2={right} />
        ))}
      </g>
      {/* Axes */}
      <g stroke="var(--subtle)" strokeWidth={1.25}>
        <line x1={L} x2={right} y1={axisX} y2={axisX} />
        <line y1={T} y2={bottom} x1={axisY} x2={axisY} />
      </g>
      {/* Tick labels, beside the axes; zero once at the origin. */}
      <g className="fill-subtle font-mono" fontSize={11}>
        {xTicks
          .filter((t) => t.v !== 0)
          .map((t) => (
            <text
              key={`lx${t.v}`}
              x={t.at}
              y={Math.min(axisX + 15, bottom + 16)}
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
              x={Math.max(axisY - 6, L - 6)}
              y={t.at + 4}
              textAnchor="end"
            >
              {fmt.format(t.v)}
            </text>
          ))}
        <text x={axisY - 6} y={axisX + 15} textAnchor="end">
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
            />
          );
        })}
      </g>
    </svg>
  );
}

function Legend({ spec }: { spec: PlotSpec }) {
  return (
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
  );
}
