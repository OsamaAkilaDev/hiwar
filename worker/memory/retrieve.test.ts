import { expect, test } from "bun:test";
import { systemPrompt } from "../llm/prompts/system";
import { isTrivial } from "./retrieve";

test("isTrivial flags greetings and short messages only", () => {
  for (const text of ["hi", "مرحبا", "thanks!", "  ok  ", "hello there"]) {
    expect(isTrivial(text)).toBe(true);
  }
  expect(isTrivial("How do I center a div in CSS?")).toBe(false);
  expect(isTrivial("كيف أعمل ريأكت كومبوننت؟")).toBe(false);
});

test("systemPrompt renders known facts and memories, or omits the block", () => {
  const empty = systemPrompt("en");
  expect(empty).not.toContain("Known about the user");
  expect(systemPrompt("en", { facts: [], memories: [] })).toBe(empty);

  const prompt = systemPrompt("en", {
    facts: [{ key: "city", value: "Jeddah" }],
    memories: ["Prefers TypeScript examples"],
  });
  expect(prompt).toContain("Known about the user");
  expect(prompt).toContain("- city: Jeddah");
  expect(prompt).toContain("- Prefers TypeScript examples");
});
