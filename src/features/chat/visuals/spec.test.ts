import { expect, test } from "bun:test";
import {
  ChartSpec,
  isClosedFence,
  parseSpec,
  StepperSpec,
  visualOfJson,
} from "./spec";

test("isClosedFence waits for the closing fence", () => {
  expect(isClosedFence('```chart\n{"data":[]}')).toBe(false);
  expect(isClosedFence("```chart")).toBe(false);
  expect(isClosedFence('```chart\n{"data":[]}\n```\n')).toBe(true);
});

test("parseSpec accepts loose model output and rejects junk", () => {
  expect(
    parseSpec(ChartSpec, '{"kind":"pie","data":[{"label":2024,"value":"12"}]}'),
  ).toEqual({ kind: "donut", data: [{ label: "2024", value: 12 }] });
  expect(parseSpec(ChartSpec, '{"data":[]}')).toBeNull();
  expect(parseSpec(ChartSpec, "{not json")).toBeNull();
  expect(parseSpec(StepperSpec, '{"steps":[{"title":"Install"}]}')).toEqual({
    steps: [{ title: "Install" }],
  });
});

test("json fences holding a visual spec are recognised; other json is not", () => {
  expect(visualOfJson('{"steps":[{"title":"Install"}]}')).toBe("stepper");
  expect(visualOfJson('{"kind":"bar","data":[{"label":"a","value":1}]}')).toBe(
    "chart",
  );
  expect(visualOfJson('{"data":[{"label":"a","value":1}]}')).toBeUndefined();
  expect(visualOfJson('{"name":"hiwar","version":1}')).toBeUndefined();
});
