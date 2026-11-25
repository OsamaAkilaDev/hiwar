let ctx: CanvasRenderingContext2D | null = null;

/** A theme token as plain rgb(a), for consumers that can't read CSS
 * (Mermaid's color parser, the sandboxed iframe). Paints one pixel, so any
 * CSS color the token holds (color-mix, oklch) comes back in sRGB. */
export function tokenColor(name: string): string {
  const probe = document.createElement("i");
  probe.style.color = `var(${name})`;
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
  return a === 255
    ? `rgb(${r} ${g} ${b})`
    : `rgb(${r} ${g} ${b} / ${(a / 255).toFixed(3)})`;
}
