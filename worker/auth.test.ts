import { expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./auth";

test("a stored hash verifies only its own password", async () => {
  const stored = await hashPassword("correct horse");
  expect(stored).not.toContain("correct horse");
  expect(await verifyPassword("correct horse", stored)).toBe(true);
  expect(await verifyPassword("correct horsf", stored)).toBe(false);
  expect(await verifyPassword("correct horse", "junk")).toBe(false);
});
