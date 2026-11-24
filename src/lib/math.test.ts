import { expect, test } from "bun:test";
import { hasMath, normalizeMath } from "./math";

test("normalizeMath turns bracket delimiters into dollar fences", () => {
  expect(normalizeMath("area \\(\\pi r^2\\) here")).toBe(
    "area $\\pi r^2$ here",
  );
  expect(normalizeMath("\\[ a^2 + b^2 = c^2 \\]")).toBe(
    "\n$$\na^2 + b^2 = c^2\n$$\n",
  );
  expect(hasMath("plain text")).toBe(false);
  expect(hasMath("cost $x$")).toBe(true);
});

test("a line of only $$…$$ becomes display math", () => {
  expect(normalizeMath("Formula:\n$$x = 1$$\nDone")).toBe(
    "Formula:\n$$\nx = 1\n$$\nDone",
  );
  expect(normalizeMath("inline $$x$$ stays")).toBe("inline $$x$$ stays");
});
