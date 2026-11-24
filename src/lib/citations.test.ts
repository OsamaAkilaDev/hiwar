import { expect, test } from "bun:test";
import { citedIn, linkCitations } from "./citations";

const sources = [
  { title: "A", url: "https://a.com" },
  { title: "B", url: "https://b.com" },
];

test("links markers, keeps indexing and unknown numbers as text", () => {
  expect(linkCitations("Gold is up [1, 2].", sources)).toBe(
    'Gold is up [1](https://a.com "cite")[2](https://b.com "cite").',
  );
  expect(linkCitations("use arr[1] here", sources)).toBe("use arr[1] here");
  expect(linkCitations("see [7]", sources)).toBe("see [7]");
  expect(linkCitations("[a link](x) [2]", sources)).toBe(
    '[a link](x) [2](https://b.com "cite")',
  );
});

test("citedIn lists cited numbers in first-use order", () => {
  expect(citedIn("a [3] b [1, 3] c arr[2]")).toEqual([3, 1]);
});
