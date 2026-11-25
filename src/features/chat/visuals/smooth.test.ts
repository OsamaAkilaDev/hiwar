import { expect, test } from "bun:test";
import { monotonePath } from "./smooth";

test("monotonePath passes through every point and stays flat at a peak", () => {
  const path = monotonePath([
    [0, 10],
    [10, 0],
    [20, 10],
    [30, 10],
  ]);
  expect(path.startsWith("M0 10C")).toBe(true);
  for (const end of ["10 0", "20 10", "30 10"]) expect(path).toContain(end);
  // The local minimum at (10, 0) has a zero slope, so the curve doesn't dip below it.
  expect(path.split("C")[1]).toMatch(/ 0 10 0$/);
});
