import { expect, test } from "bun:test";
import { dirOf } from "./dir";

test("Arabic paragraph that starts with a Latin word is rtl", () => {
  expect(dirOf("React هي مكتبة جافاسكريبت لبناء الواجهات")).toBe("rtl");
});

test("English paragraph with one Arabic word is ltr", () => {
  expect(dirOf("Hiwar means حوار in Arabic")).toBe("ltr");
});
