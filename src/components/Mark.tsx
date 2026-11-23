// The dot-matrix haa (ح) from brand/mark.svg: lit dots take the accent,
// ghost dots follow the text color.
const ROWS = ["###..", "...##", ".##..", "#....", "#....", "#...#", ".###."];

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden className={className}>
      {ROWS.flatMap((row, y) =>
        [...row].map((cell, x) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: static grid
            key={`${x}-${y}`}
            cx={60 + x * 34}
            cy={26 + y * 34}
            r={cell === "#" ? 14.3 : 5.1}
            fill={cell === "#" ? "var(--accent)" : "currentColor"}
            opacity={cell === "#" ? undefined : 0.18}
          />
        )),
      )}
    </svg>
  );
}
