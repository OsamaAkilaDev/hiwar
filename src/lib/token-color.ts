let ctx: CanvasRenderingContext2D | null = null;

/** A theme token (`--accent`) or any CSS colour that uses tokens, as plain
 * hex: for consumers that can't read CSS (Mermaid's colour parser, the
 * sandboxed iframe). Paints one pixel, so color-mix and oklch come back in
 * sRGB. */
export function tokenColor(color: string): string {
  const probe = document.createElement("i");
  probe.style.color = color.startsWith("--") ? `var(${color})` : color;
  document.body.append(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  ctx ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!ctx) return css;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a = 255] = ctx.getImageData(0, 0, 1, 1).data;
  // Hex: the one notation Mermaid, Graphviz and plain CSS all read.
  const hex = (n = 0) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a === 255 ? "" : hex(a)}`;
}
