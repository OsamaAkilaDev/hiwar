import type { CSSProperties } from "react";
import type { ChartSpec } from "./spec";

type Props = { spec: ChartSpec; lang: "ar" | "en" };

// Western digits in both languages: the model writes them that way, and
// mixing digit systems inside one reply reads as a bug.
const formatter = (lang: "ar" | "en") => {
  const plain = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", {
    maximumFractionDigits: 2,
  });
  const compact = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return (n: number) => (Math.abs(n) >= 10_000 ? compact : plain).format(n);
};

/** Accent ramp for categories: strongest first, fading toward the surface. */
const shade = (i: number, count: number) =>
  `color-mix(in oklab, var(--accent) ${Math.round(100 - (i / Math.max(count - 1, 1)) * 70)}%, var(--surface-2))`;

export function Chart({ spec, lang }: Props) {
  const format = formatter(lang);
  return (
    <>
      <div aria-hidden>
        {spec.kind === "line" ? (
          <Line spec={spec} format={format} rtl={lang === "ar"} />
        ) : spec.kind === "donut" ? (
          <Donut spec={spec} />
        ) : (
          <Bars spec={spec} format={format} />
        )}
      </div>
      <table className="sr-only">
        {spec.title ? <caption>{spec.title}</caption> : null}
        <tbody>
          {spec.data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {format(d.value)}
                {spec.unit ? ` ${spec.unit}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

type Part = { spec: ChartSpec; format: (n: number) => string };

// Horizontal bars in HTML: long Arabic labels wrap and mirror for free.
// Short units (%, k, M) ride on each value; longer ones stay in the title.
function Bars({ spec, format }: Part) {
  const max = Math.max(...spec.data.map((d) => d.value), 0) || 1;
  return (
    <div className="grid grid-cols-[minmax(0,min(10rem,38%))_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5">
      {spec.data.map((d, i) => (
        <div key={d.label} className="contents">
          <span className="truncate text-muted text-sm" title={d.label}>
            {d.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span
              className="chart-bar block h-full rounded-full"
              style={
                {
                  width: `${(Math.max(d.value, 0) / max) * 100}%`,
                  background:
                    d.value === max
                      ? "var(--accent)"
                      : "color-mix(in oklab, var(--accent) 50%, var(--surface-2))",
                  "--i": i,
                } as CSSProperties
              }
            />
          </span>
          <span className="font-mono text-xs tabular-nums">
            {format(d.value)}
            {spec.unit && spec.unit.length <= 3 ? (
              <span className="ms-0.5 text-subtle">{spec.unit}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

const W = 600;
const H = 200;

function Line({ spec, format, rtl }: Part & { rtl: boolean }) {
  const values = spec.data.map((d) => d.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(...values, lo + 1);
  const n = spec.data.length;
  // In Arabic the series reads right to left, like the text around it.
  const x = (i: number) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return (rtl ? 1 - t : t) * W;
  };
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const points = spec.data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const ticks = [hi, (hi + lo) / 2, lo];
  const labels =
    n <= 8
      ? spec.data.map((d) => d.label)
      : [spec.data[0]?.label, spec.data[n - 1]?.label];
  const last = spec.data[n - 1];

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
      <div className="flex h-44 flex-col justify-between py-0 text-end font-mono text-[0.7rem] text-subtle tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="-my-1.5">
            {format(t)}
          </span>
        ))}
      </div>
      <div className="relative h-44">
        <svg
          aria-hidden
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="chart-wipe absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <line
              key={t}
              x1="0"
              x2={W}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polygon
            className="chart-area"
            points={`${x(0)},${H} ${points} ${x(n - 1)},${H}`}
            fill="url(#area)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last ? (
          <span
            className="chart-dot absolute size-2.5 -translate-1/2 rounded-full bg-accent ring-4 ring-accent-soft"
            style={{
              left: `${(x(n - 1) / W) * 100}%`,
              top: `${(y(last.value) / H) * 100}%`,
            }}
          />
        ) : null}
      </div>
      <div className="col-start-2 mt-2 flex justify-between gap-2 text-[0.7rem] text-subtle">
        {labels.map((l, i) => (
          // On a phone only the ends and the middle label keep their room.
          <span
            key={l}
            className={`min-w-0 truncate ${
              i === 0 ||
              i === labels.length - 1 ||
              i === Math.floor(labels.length / 2)
                ? ""
                : "max-sm:hidden"
            }`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ spec }: { spec: ChartSpec }) {
  const positive = spec.data.map((d) => ({
    ...d,
    value: Math.max(d.value, 0),
  }));
  const total = positive.reduce((sum, d) => sum + d.value, 0) || 1;
  const top = positive.reduce((a, b) => (b.value > a.value ? b : a));
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="relative size-36 shrink-0">
        <svg aria-hidden viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="14"
          />
          {positive.map((d, i) => {
            const pct = (d.value / total) * 100;
            const start = offset;
            offset += pct;
            return (
              <circle
                key={d.label}
                className="chart-slice"
                cx="60"
                cy="60"
                r="48"
                fill="none"
                pathLength={100}
                stroke={shade(i, positive.length)}
                strokeWidth="14"
                strokeDasharray={`${Math.max(pct - 0.6, 0)} ${100 - Math.max(pct - 0.6, 0)}`}
                strokeDashoffset={-start}
                style={{ "--i": i } as CSSProperties}
              />
            );
          })}
        </svg>
        <span className="absolute inset-0 grid place-content-center text-center">
          <span className="font-display font-medium text-xl tabular-nums">
            {Math.round((top.value / total) * 100)}%
          </span>
          <span className="max-w-20 truncate text-subtle text-xs">
            {top.label}
          </span>
        </span>
      </div>
      <ul className="grid min-w-44 flex-1 gap-2 text-sm">
        {positive.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: shade(i, positive.length) }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">
              {d.label}
            </span>
            <span className="font-mono text-xs tabular-nums">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
