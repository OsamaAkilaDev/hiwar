import type { CSSProperties } from "react";

// The dot-matrix haa (ح) from brand/mark.svg: lit dots take the accent,
// ghost dots follow the text color.
const ROWS = ["###..", "...##", ".##..", "#....", "#....", "#...#", ".###."];

// Pen order of the lit dots as [row, column]; drives draw-in and thinking.
const STROKE = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 2],
  [2, 1],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [5, 4],
];

type Props = { className?: string; animate?: "draw" | "think" };

export function Mark({ className, animate }: Props) {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden
      className={`${className ?? ""} ${animate ? `mark-${animate}` : ""}`}
    >
      {ROWS.flatMap((row, y) =>
        [...row].map((cell, x) => {
          const lit = cell === "#";
          return (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: static grid
              key={`${x}-${y}`}
              cx={60 + x * 34}
              cy={26 + y * 34}
              r={lit ? 14.3 : 5.1}
              fill={lit ? "var(--accent)" : "currentColor"}
              opacity={lit ? undefined : 0.18}
              className={lit ? "dot" : "ghost"}
              style={
                lit
                  ? ({
                      "--i": STROKE.findIndex(([r, c]) => r === y && c === x),
                    } as CSSProperties)
                  : undefined
              }
            />
          );
        }),
      )}
    </svg>
  );
}
