import { CheckIcon, XIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { useT } from "../../../i18n";
import type {
  CompareSpec,
  CycleSpec,
  ProsConsSpec,
  TimelineSpec,
  TreeNode,
  TreeSpec,
} from "./spec";

// Hiwar's own diagram blocks: the model fills a small JSON spec, these draw
// it with the app's tokens, type and motion. Every layout is logical, so it
// mirrors for Arabic without extra rules.

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/** Dated events on a rail, oldest first. */
export function Timeline({ spec }: { spec: TimelineSpec }) {
  return (
    <ol className="grid">
      {spec.events.map((event, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered; titles may repeat
          key={i}
          className="timeline-event block-in relative ps-7 pb-5 last:pb-0"
          style={stagger(i)}
        >
          <span
            aria-hidden
            className="absolute start-0 top-1 size-3.5 rounded-full border-2 border-accent bg-surface"
          />
          <p className="font-mono text-accent-text text-xs">{event.date}</p>
          <p className="mt-0.5 font-medium leading-snug">{event.title}</p>
          {event.body ? (
            <p className="mt-1 text-muted text-sm leading-relaxed">
              {event.body}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Two to four options side by side. */
export function Compare({ spec }: { spec: CompareSpec }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
      {spec.items.map((item, i) => (
        <section
          // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered
          key={i}
          className="block-in rounded-xl border border-line bg-bg/40 p-4"
          style={stagger(i)}
        >
          <h4 className="font-display font-medium text-[0.95rem] [&:lang(ar)]:font-kufi">
            {item.name}
          </h4>
          {item.summary ? (
            <p className="mt-1 text-muted text-sm leading-relaxed">
              {item.summary}
            </p>
          ) : null}
          <ul className="mt-3 grid gap-1.5 border-line border-t pt-3 text-sm">
            {item.points.map((point, j) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered
                key={j}
                className="flex gap-2 leading-relaxed"
              >
                <span
                  aria-hidden
                  className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent"
                />
                {point}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Strengths and drawbacks; each side carries an icon and a heading, not just a colour. */
export function ProsCons({ spec }: { spec: ProsConsSpec }) {
  const t = useT();
  const side = (
    heading: string,
    items: string[],
    good: boolean,
    offset: number,
  ) => (
    <section
      className="block-in rounded-xl border border-line bg-bg/40 p-4"
      style={stagger(offset)}
    >
      <h4
        className={`flex items-center gap-2 font-medium text-sm ${good ? "text-accent-text" : "text-danger"}`}
      >
        <span
          aria-hidden
          className={`grid size-5 place-items-center rounded-full ${good ? "bg-accent-soft" : "bg-danger/15"}`}
        >
          {good ? (
            <CheckIcon weight="bold" className="size-3" />
          ) : (
            <XIcon weight="bold" className="size-3" />
          )}
        </span>
        {heading}
      </h4>
      <ul className="mt-3 grid gap-2 text-sm">
        {items.map((item, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered
            key={i}
            className="flex gap-2.5 leading-relaxed"
          >
            <span
              aria-hidden
              className={`mt-[0.6em] size-1.5 shrink-0 rounded-full ${good ? "bg-accent" : "bg-danger"}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {side(t("visual.pros"), spec.pros, true, 0)}
      {side(t("visual.cons"), spec.cons, false, 1)}
    </div>
  );
}

const R = 38; // ring radius, in % of the square

/** A loop of steps around a ring, read clockwise (anticlockwise in Arabic). */
export function Cycle({ spec, dir }: { spec: CycleSpec; dir: "rtl" | "ltr" }) {
  const n = spec.steps.length;
  const flip = dir === "rtl" ? -1 : 1;
  const at = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 50 + flip * R * Math.cos(rad), y: 50 + R * Math.sin(rad) };
  };
  const angle = (i: number) => -90 + (i * 360) / n;
  // Ring left clear on each side of a node, so arrows never touch a label.
  const gap = (360 / n) * 0.3;
  const arcs = spec.steps.map((_, i) => {
    const a = at(angle(i) + gap);
    const b = at(angle(i + 1) - gap);
    return `M ${a.x} ${a.y} A ${R} ${R} 0 0 ${flip > 0 ? 1 : 0} ${b.x} ${b.y}`;
  });
  const described = spec.steps.some((s) => s.body);

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <marker
              id="cycle-head"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 1 L9 5 L0 9 z" className="fill-subtle" />
            </marker>
          </defs>
          {arcs.map((d, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: one arc per step
              key={i}
              d={d}
              fill="none"
              strokeWidth="0.6"
              markerEnd="url(#cycle-head)"
              className="stroke-subtle"
            />
          ))}
        </svg>
        <ol>
          {spec.steps.map((step, i) => {
            const p = at(angle(i));
            return (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered
                key={i}
                // w-max: an absolute box near the edge would otherwise shrink
                // to the space left of it and break labels mid-word.
                className="absolute flex w-max max-w-[8.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span
                  className="block-in grid size-7 place-items-center rounded-full bg-accent font-mono text-accent-ink text-xs"
                  style={stagger(i)}
                >
                  {i + 1}
                </span>
                <span
                  className="block-in rounded-lg bg-surface px-1.5 font-medium text-[0.8rem] leading-snug sm:text-sm"
                  style={stagger(i)}
                >
                  {step.title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {described ? (
        <ol className="mt-4 grid gap-2 border-line border-t pt-4 text-sm">
          {spec.steps.map((step, i) =>
            step.body ? (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: static once rendered
                key={i}
                className="flex gap-2.5 leading-relaxed"
              >
                <span className="font-mono text-accent-text text-xs leading-[1.7]">
                  {i + 1}
                </span>
                <span>
                  <span className="font-medium">{step.title}</span>
                  <span className="text-muted"> · {step.body}</span>
                </span>
              </li>
            ) : null,
          )}
        </ol>
      ) : null}
    </div>
  );
}

/** A hierarchy as an indented tree with connector lines. */
export function Tree({ spec }: { spec: TreeSpec }) {
  let order = 0;
  const node = (n: TreeNode, depth: number) => (
    <li className="tree-node" key={`${depth}-${order}`}>
      <span
        className={`block-in inline-block rounded-md px-2 py-0.5 text-sm ${depth === 0 ? "bg-accent font-medium text-accent-ink" : depth === 1 ? "bg-accent-soft font-medium" : "bg-surface-2"}`}
        style={stagger(order++)}
      >
        {n.label}
      </span>
      {n.children?.length ? (
        <ul className="tree-branch">
          {n.children.map((child) => node(child, depth + 1))}
        </ul>
      ) : null}
    </li>
  );
  return <ul className="tree">{node(spec.root, 0)}</ul>;
}
