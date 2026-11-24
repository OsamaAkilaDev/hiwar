import type { CSSProperties } from "react";
import type { StepperSpec } from "./spec";

// A numbered rail: each step's number sits on a thin line that ties the
// sequence together, so order reads at a glance in either direction.
export function Stepper({ spec }: { spec: StepperSpec }) {
  return (
    <ol className="grid">
      {spec.steps.map((step, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are static once rendered; titles may repeat
          key={i}
          className="step relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0"
          style={{ "--i": i } as CSSProperties}
        >
          <span className="relative z-10 grid size-7 place-items-center rounded-full bg-accent-soft font-mono text-accent-text text-xs">
            {i + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-medium leading-snug">{step.title}</p>
            {step.body ? (
              <p className="mt-1 text-muted text-sm leading-relaxed">
                {step.body}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
