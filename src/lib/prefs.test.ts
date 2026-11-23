import { expect, test } from "bun:test";
import { paletteOf, resolveLocale, resolveTheme } from "./resolve-prefs";

test("an Arabic browser language picks ar", () => {
  expect(resolveLocale({ saved: null, languages: ["ar-AE", "en"] })).toBe("ar");
});

test("a saved locale wins over the browser", () => {
  expect(resolveLocale({ saved: "en", languages: ["ar"] })).toBe("en");
});

test("unsupported languages fall back to en", () => {
  expect(resolveLocale({ saved: null, languages: ["fr"] })).toBe("en");
});

test("theme defaults to dark", () => {
  expect(resolveTheme(null)).toBe("dark");
  expect(resolveTheme("bogus")).toBe("dark");
  expect(resolveTheme("light")).toBe("light");
});

test("system follows the OS, other themes are fixed", () => {
  expect(resolveTheme("system")).toBe("system");
  expect(paletteOf("system", false)).toBe("light");
  expect(paletteOf("system", true)).toBe("dark");
  expect(paletteOf("dark", false)).toBe("dark");
});
