import { z } from "zod";

export const VISUAL_LANGS = ["chart", "mermaid", "stepper", "html"] as const;
export type VisualLang = (typeof VISUAL_LANGS)[number];

export const isVisualLang = (lang: string): lang is VisualLang =>
  (VISUAL_LANGS as readonly string[]).includes(lang);

// A fence is closed once its last line is the closing ``` (or ~~~). Until
// then the row shows a placeholder instead of half a spec.
export const isClosedFence = (raw: string) => {
  const lines = raw.trimEnd().split("\n");
  return lines.length > 1 && /^\s*(`{3,}|~{3,})\s*$/.test(lines.at(-1) ?? "");
};

export const ChartSpec = z.object({
  kind: z.preprocess(
    (v) => (v === "pie" ? "donut" : v),
    z.enum(["bar", "line", "donut"]).catch("bar"),
  ),
  title: z.string().max(120).optional(),
  unit: z.string().max(12).optional(),
  data: z
    .array(
      z.object({
        label: z.coerce.string().max(60),
        value: z.coerce.number().finite(),
      }),
    )
    .min(1)
    .max(24),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const StepperSpec = z.object({
  title: z.string().max(120).optional(),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        body: z.string().max(600).optional(),
      }),
    )
    .min(1)
    .max(12),
});
export type StepperSpec = z.infer<typeof StepperSpec>;

/** Parses a JSON visual spec; anything malformed is null (shown as code). */
export function parseSpec<T>(schema: z.ZodType<T>, code: string): T | null {
  try {
    const result = schema.safeParse(JSON.parse(code));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
