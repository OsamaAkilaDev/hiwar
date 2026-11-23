import { expect, test } from "bun:test";
import { decide, parseExtraction, resolveReplaces } from "./extract";

test("parseExtraction reads fenced JSON and strips unknown fields", () => {
  const raw =
    '```json\n{"facts":[{"key":" name ","value":"Sara","x":1}],"memories":[{"content":"Prefers TypeScript.","importance":2,"y":1}],"z":1}\n```';
  expect(parseExtraction(raw)).toEqual({
    facts: [{ key: "name", value: "Sara" }],
    memories: [{ content: "Prefers TypeScript.", importance: 1 }],
  });
});

test("parseExtraction defaults importance and caps long strings", () => {
  const { facts, memories } = parseExtraction(
    JSON.stringify({
      facts: [{ key: "k".repeat(99), value: "v".repeat(999) }],
      memories: [{ content: "c".repeat(999) }],
    }),
  );
  expect(facts[0]?.key).toHaveLength(40);
  expect(facts[0]?.value).toHaveLength(200);
  expect(memories[0]?.content).toHaveLength(300);
  expect(memories[0]?.importance).toBe(0.5);
});

test("parseExtraction returns empty on invalid input", () => {
  const empty = { facts: [], memories: [] };
  expect(parseExtraction("not json")).toEqual(empty);
  expect(parseExtraction('{"facts":"nope"}')).toEqual(empty);
});

test("decide thresholds", () => {
  expect(decide(0.95)).toBe("duplicate");
  expect(decide(0.88)).toBe("supersede");
  expect(decide(0.5)).toBe("insert");
});

test("parseExtraction keeps a valid replaces and drops invalid ones", () => {
  const { memories } = parseExtraction(
    JSON.stringify({
      facts: [],
      memories: [
        { content: "a", replaces: 2 },
        { content: "b", replaces: 0 },
        { content: "c", replaces: "x" },
        { content: "d" },
      ],
    }),
  );
  expect(memories.map((m) => m.replaces)).toEqual([
    2,
    undefined,
    undefined,
    undefined,
  ]);
});

test("resolveReplaces maps numbers to ids and drops out-of-range", () => {
  const items = [{ replaces: 1 }, { replaces: 3 }, { replaces: 4 }, {}];
  expect(resolveReplaces(items, ["a", "b", "c"])).toEqual([
    "a",
    "c",
    undefined,
    undefined,
  ]);
});
