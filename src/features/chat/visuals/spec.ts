// zod/mini: the same validation as zod, tree-shaken to a few KB. These specs
// are written by the model, so they are checked before rendering.
import * as z from "zod/mini";

export const VISUAL_LANGS = [
  "chart",
  "mermaid",
  "dot",
  "markmap",
  "stepper",
  "html",
] as const;
export type VisualLang = (typeof VISUAL_LANGS)[number];

// Other names models use for the same languages.
const ALIASES: Record<string, VisualLang> = { graphviz: "dot", gv: "dot" };

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

/** Parses a JSON visual spec; anything malformed is null (shown as code). */
export function parseSpec<T>(schema: z.ZodMiniType<T>, code: string): T | null {
  try {
    const result = schema.safeParse(JSON.parse(code));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Models sometimes tag a visual spec as json; a closed fence that is exactly
 * a stepper, or a chart naming its kind, renders as that visual. */
export function visualOfJson(code: string): "chart" | "stepper" | undefined {
  if (parseSpec(StepperSpec, code)) return "stepper";
  if (/"kind"\s*:/.test(code) && parseSpec(ChartSpec, code)) return "chart";
  return undefined;
}
