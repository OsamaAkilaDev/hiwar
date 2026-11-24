import type { ReactNode } from "react";

// The shared card for every visual. Content sits in its own wrapper so the
// prose rules (list markers, streaming caret) never reach inside.
export function Frame({
  title,
  unit,
  dir,
  action,
  children,
}: {
  title?: string;
  unit?: string;
  dir: "rtl" | "ltr";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure dir={dir} className="visual enter [--i:0]">
      {title || action ? (
        <figcaption className="mb-4 flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            {title ? (
              <span className="font-display font-medium text-[0.95rem] [&:lang(ar)]:font-kufi">
                {title}
              </span>
            ) : null}
            {unit ? (
              <span className="ms-2 text-subtle text-xs">{unit}</span>
            ) : null}
          </span>
          {action}
        </figcaption>
      ) : null}
      <div>{children}</div>
    </figure>
  );
}
