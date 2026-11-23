import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { createFrameFlusher } from "./frame-flush";

let frame: (() => void) | undefined;
const original = {
  raf: globalThis.requestAnimationFrame,
  caf: globalThis.cancelAnimationFrame,
};

beforeEach(() => {
  frame = undefined;
  globalThis.requestAnimationFrame = ((cb: () => void) => {
    frame = cb;
    return 1;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = () => {};
});

afterEach(() => {
  globalThis.requestAnimationFrame = original.raf;
  globalThis.cancelAnimationFrame = original.caf;
});

test("batches pushes into one flush per frame", () => {
  const flush = mock();
  const flusher = createFrameFlusher(flush);
  flusher.push("a", "he");
  flusher.push("a", "l");
  flusher.push("a", "lo");
  expect(flush).not.toHaveBeenCalled();
  frame?.();
  expect(flush).toHaveBeenCalledTimes(1);
  expect(flush).toHaveBeenCalledWith("a", "hello");
});

test("flushNow flushes immediately and the pending frame is a no-op", () => {
  const flush = mock();
  const flusher = createFrameFlusher(flush);
  flusher.push("a", "hi");
  flusher.flushNow();
  expect(flush).toHaveBeenCalledWith("a", "hi");
  frame?.();
  expect(flush).toHaveBeenCalledTimes(1);
});
