import { expect, test } from "bun:test";
import { cleanTitle } from "./title";

test("cleanTitle strips quotes and trailing punctuation", () => {
  expect(cleanTitle('"React basics."')).toBe("React basics");
});

test("cleanTitle keeps the first line and drops Markdown markers", () => {
  expect(cleanTitle("# Title\nmore")).toBe("Title");
  expect(cleanTitle("**Bold** `idea`")).toBe("Bold idea");
});

test("cleanTitle caps at a word boundary", () => {
  const title = cleanTitle("word ".repeat(24));
  expect(title?.length).toBeLessThanOrEqual(60);
  expect(title).toMatch(/^(word )*word$/);
});

test("cleanTitle returns null when nothing is left", () => {
  expect(cleanTitle("   ")).toBeNull();
  expect(cleanTitle('"."')).toBeNull();
});

test("cleanTitle keeps Arabic", () => {
  expect(cleanTitle("«شرح أساسيات React؟»")).toBe("شرح أساسيات React");
});
