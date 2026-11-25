import { expect, test } from "bun:test";
import { compile } from "./expr";

test("compile evaluates the forms models write, and rejects anything else", () => {
  const at = (src: string, x: number) => compile(src)(x);
  expect(at("x^2", 3)).toBe(9);
  expect(at("y = -x^2 + 2x", 3)).toBe(-3);
  expect(at("f(x) = 2sin(x)", Math.PI / 2)).toBeCloseTo(2);
  expect(at("sinx", Math.PI / 2)).toBeCloseTo(1);
  expect(at("3(x+1)", 1)).toBe(6);
  expect(at("x**3 / 2", 2)).toBe(4);
  expect(at("2^x^2", 1)).toBe(2);
  expect(at("e^(-x)", 0)).toBe(1);
  expect(at("abs(x) + pi", -1)).toBeCloseTo(1 + Math.PI);
  expect(() => compile("alert(1)")).toThrow();
  expect(() => compile("constructor")).toThrow();
  expect(() => compile("x +")).toThrow();
});
