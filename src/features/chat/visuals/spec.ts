// zod/mini: the same validation as zod, tree-shaken to a few KB. These specs
// are written by the model, so they are checked before rendering.
import * as z from "zod/mini";

export const VISUAL_LANGS = [
  "chart",
  "plot",
  "mermaid",
  "dot",
  "markmap",
  "stepper",
  "timeline",
  "compare",
  "cycle",
  "tree",
  "proscons",
  "html",
] as const;
export type VisualLang = (typeof VISUAL_LANGS)[number];

// Other names models use for the same languages.
const ALIASES: Record<string, VisualLang> = {
  graphviz: "dot",
  gv: "dot",
  comparison: "compare",
  "pros-cons": "proscons",
  pros_cons: "proscons",
};

/** The visual a fence's language tag names, if any. */
export const visualLangOf = (lang: string): VisualLang | undefined =>
  ALIASES[lang] ??
  ((VISUAL_LANGS as readonly string[]).find((l) => l === lang) as
    | VisualLang
    | undefined);

// A fence is closed once its last line is the closing ``` (or ~~~). Until
// then the row shows a placeholder instead of half a spec.
export const isClosedFence = (raw: string) => {
  const lines = raw.trimEnd().split("\n");
  return lines.length > 1 && /^\s*(`{3,}|~{3,})\s*$/.test(lines.at(-1) ?? "");
};

const text = (max: number) => z.string().check(z.maxLength(max));

export const ChartSpec = z.object({
  kind: z.pipe(
    z.transform((v: unknown) => (v === "pie" ? "donut" : v)),
    z.catch(z.enum(["bar", "line", "donut"]), "bar"),
  ),
  title: z.optional(text(120)),
  unit: z.optional(text(12)),
  data: z
    .array(
      z.object({
        label: z.coerce.string().check(z.maxLength(60)),
        // z.number() already rejects NaN and Infinity.
        value: z.coerce.number(),
      }),
    )
    .check(z.minLength(1), z.maxLength(24)),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const StepperSpec = z.object({
  title: z.optional(text(120)),
  steps: z
    .array(
      z.object({
        title: z.string().check(z.minLength(1), z.maxLength(120)),
        body: z.optional(text(600)),
      }),
    )
    .check(z.minLength(1), z.maxLength(12)),
});
export type StepperSpec = z.infer<typeof StepperSpec>;

const range = z.optional(
  z
    .tuple([z.coerce.number(), z.coerce.number()])
    .check(z.refine(([lo, hi]) => lo < hi, "empty range")),
);
export const PlotSpec = z.object({
  title: z.optional(text(120)),
  x: range,
  y: range,
  functions: z
    .array(
      z.object({
        expr: z.string().check(z.minLength(1), z.maxLength(120)),
        label: z.optional(text(60)),
      }),
    )
    .check(z.minLength(1), z.maxLength(4)),
});
export type PlotSpec = z.infer<typeof PlotSpec>;

const list = <T extends z.ZodMiniType>(item: T, min: number, max: number) =>
  z.array(item).check(z.minLength(min), z.maxLength(max));
const label = (max: number) =>
  z.coerce.string().check(z.minLength(1), z.maxLength(max));

export const TimelineSpec = z.object({
  title: z.optional(text(120)),
  events: list(
    z.object({
      date: label(40),
      title: label(120),
      body: z.optional(text(400)),
    }),
    2,
    12,
  ),
});
export type TimelineSpec = z.infer<typeof TimelineSpec>;

export const CompareSpec = z.object({
  title: z.optional(text(120)),
  items: list(
    z.object({
      name: label(60),
      summary: z.optional(text(200)),
      points: list(label(160), 1, 8),
    }),
    2,
    4,
  ),
});
export type CompareSpec = z.infer<typeof CompareSpec>;

export const CycleSpec = z.object({
  title: z.optional(text(120)),
  steps: list(
    z.object({ title: label(40), body: z.optional(text(300)) }),
    3,
    8,
  ),
});
export type CycleSpec = z.infer<typeof CycleSpec>;

export type TreeNode = { label: string; children?: TreeNode[] };
const TreeNode: z.ZodMiniType<TreeNode> = z.object({
  label: label(80),
  get children() {
    return z.optional(list(TreeNode, 0, 10));
  },
});
export const TreeSpec = z.object({
  title: z.optional(text(120)),
  root: TreeNode,
});
export type TreeSpec = z.infer<typeof TreeSpec>;

export const ProsConsSpec = z.object({
  title: z.optional(text(120)),
  pros: list(label(200), 1, 10),
  cons: list(label(200), 1, 10),
});
export type ProsConsSpec = z.infer<typeof ProsConsSpec>;

/** Parses a JSON visual spec; anything malformed is null (shown as code).
 * Models sometimes wrap the spec in its own name ({"compare": {...}}); the
 * inner object is tried too. */
export function parseSpec<T>(schema: z.ZodMiniType<T>, code: string): T | null {
  let json: unknown;
  try {
    json = JSON.parse(code);
  } catch {
    return null;
  }
  const direct = schema.safeParse(json);
  if (direct.success) return direct.data;
  const values = json && typeof json === "object" ? Object.values(json) : [];
  if (values.length !== 1) return null;
  const inner = schema.safeParse(values[0]);
  return inner.success ? inner.data : null;
}

// JSON blocks a json-tagged fence may hold, most specific first: stepper
// before cycle (both are steps; a cycle must be named).
const JSON_BLOCKS = [
  ["plot", PlotSpec],
  ["timeline", TimelineSpec],
  ["compare", CompareSpec],
  ["proscons", ProsConsSpec],
  ["tree", TreeSpec],
  ["stepper", StepperSpec],
] as const;
type JsonBlock = (typeof JSON_BLOCKS)[number][0] | "chart" | "cycle";

/** Models sometimes tag a visual spec as json: a closed fence that is exactly
 * one of the JSON blocks (or wraps one in its name) renders as that block. */
export function visualOfJson(code: string): JsonBlock | undefined {
  const named = code.match(/^\s*\{\s*"(\w+)"\s*:\s*\{/)?.[1];
  if (named === "cycle" && parseSpec(CycleSpec, code)) return "cycle";
  if (/"kind"\s*:/.test(code) && parseSpec(ChartSpec, code)) return "chart";
  for (const [lang, schema] of JSON_BLOCKS) {
    if ((!named || named === lang) && parseSpec(schema as z.ZodMiniType, code))
      return lang;
  }
  return undefined;
}
