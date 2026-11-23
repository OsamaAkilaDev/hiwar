import { expect, test } from "bun:test";
import { withRetry } from "./retry";

const dropped = () => new Error("Connection terminated unexpectedly");

test("withRetry retries once on a dropped connection", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    if (++calls === 1) throw dropped();
    return "ok";
  });
  expect(result).toBe("ok");
  expect(calls).toBe(2);
});

test("withRetry matches the error cause", async () => {
  let calls = 0;
  await withRetry(async () => {
    if (++calls === 1) throw new Error("query failed", { cause: dropped() });
  });
  expect(calls).toBe(2);
});

test("withRetry rethrows other errors immediately", async () => {
  let calls = 0;
  const run = withRetry(async () => {
    calls++;
    throw new Error("syntax error");
  });
  await expect(run).rejects.toThrow("syntax error");
  expect(calls).toBe(1);
});

test("withRetry gives up after the second failure", async () => {
  let calls = 0;
  const run = withRetry(async () => {
    calls++;
    throw dropped();
  });
  await expect(run).rejects.toThrow("Connection terminated");
  expect(calls).toBe(2);
});
