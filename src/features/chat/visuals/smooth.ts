/** An SVG path through every point as a monotone cubic (as in d3's
 * curveMonotoneX): smooth, yet it never overshoots a data point, so it
 * invents no peaks or dips. x may run either way (right to left in Arabic). */
export function monotonePath(points: [number, number][]): string {
  const n = points.length;
  const at = (i: number) => points[i] as [number, number];
  if (n < 3)
    return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  const h = (i: number) => at(i + 1)[0] - at(i)[0];
  const d = (i: number) => (at(i + 1)[1] - at(i)[1]) / h(i);
  const slopes = points.map((_, i) => {
    if (i === 0) return d(0);
    if (i === n - 1) return d(n - 2);
    const [d0, d1, h0, h1] = [d(i - 1), d(i), h(i - 1), h(i)];
    const p = (d0 * h1 + d1 * h0) / (h0 + h1);
    return (
      (Math.sign(d0) + Math.sign(d1)) *
      Math.min(Math.abs(d0), Math.abs(d1), 0.5 * Math.abs(p))
    );
  });
  let path = `M${at(0)[0]} ${at(0)[1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = at(i);
    const [x1, y1] = at(i + 1);
    const dx = (x1 - x0) / 3;
    const m0 = slopes[i] ?? 0;
    const m1 = slopes[i + 1] ?? 0;
    path += `C${x0 + dx} ${y0 + dx * m0} ${x1 - dx} ${y1 - dx * m1} ${x1} ${y1}`;
  }
  return path;
}
