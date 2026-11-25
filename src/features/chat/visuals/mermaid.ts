import mermaid from "mermaid";
import { tokenColor as c } from "../../../lib/token-color";

// Accent mixed into the surface: tints for fills that sit behind text.
const tint = (pct: number) =>
  c(`color-mix(in oklab, var(--accent) ${pct}%, var(--surface))`);

// Every diagram type themed from the app's tokens. Re-read per render, so a
// theme or accent switch redraws in the new colours.
function configure() {
  const surface = c("--surface");
  const raised = c("--surface-2");
  const fg = c("--fg");
  const muted = c("--muted");
  const line = c("--line");
  const subtle = c("--subtle");
  const accent = c("--accent");
  const ink = c("--accent-ink");
  const soft = tint(22);
  const scale = [accent, tint(55), tint(40), tint(30), tint(22), tint(15)];

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: getComputedStyle(document.body).fontFamily,
    flowchart: { curve: "basis", padding: 14 },
    sequence: { mirrorActors: false },
    themeVariables: {
      fontSize: "14px",
      background: surface,
      mainBkg: raised,
      primaryColor: raised,
      primaryTextColor: fg,
      primaryBorderColor: accent,
      secondaryColor: soft,
      secondaryTextColor: fg,
      secondaryBorderColor: line,
      tertiaryColor: surface,
      tertiaryTextColor: fg,
      tertiaryBorderColor: line,
      lineColor: subtle,
      textColor: fg,
      titleColor: fg,
      edgeLabelBackground: surface,
      clusterBkg: surface,
      clusterBorder: line,
      // Sequence
      actorBkg: raised,
      actorBorder: accent,
      actorTextColor: fg,
      actorLineColor: line,
      signalColor: muted,
      signalTextColor: fg,
      labelBoxBkgColor: raised,
      labelBoxBorderColor: line,
      labelTextColor: fg,
      loopTextColor: fg,
      noteBkgColor: soft,
      noteBorderColor: accent,
      noteTextColor: fg,
      activationBkgColor: soft,
      activationBorderColor: accent,
      sequenceNumberColor: ink,
      // Gantt
      sectionBkgColor: raised,
      altSectionBkgColor: surface,
      sectionBkgColor2: raised,
      gridColor: line,
      taskBkgColor: soft,
      taskBorderColor: accent,
      taskTextColor: fg,
      taskTextOutsideColor: fg,
      taskTextLightColor: fg,
      taskTextDarkColor: fg,
      activeTaskBkgColor: accent,
      activeTaskBorderColor: accent,
      doneTaskBkgColor: raised,
      doneTaskBorderColor: line,
      critBkgColor: c("--danger"),
      critBorderColor: c("--danger"),
      todayLineColor: accent,
      // State, class, ER
      labelColor: fg,
      altBackground: surface,
      attributeBackgroundColorOdd: surface,
      attributeBackgroundColorEven: raised,
      // Pie, mindmap, timeline, journey
      pieStrokeColor: surface,
      pieOuterStrokeColor: line,
      pieTitleTextColor: fg,
      pieSectionTextColor: ink,
      pieLegendTextColor: fg,
      ...Object.fromEntries(
        scale.flatMap((color, i) => [
          [`pie${i + 1}`, color],
          [`cScale${i}`, color],
          [`cScaleLabel${i}`, i === 0 ? ink : fg],
          [`fillType${i}`, color],
        ]),
      ),
    },
  });
}

/** SVG markup, or null when the code isn't valid Mermaid. */
export async function render(code: string, id: string): Promise<string | null> {
  configure();
  // Small models often write invalid Mermaid: parse first, so the reply falls
  // back to the source instead of Mermaid's error graphic.
  if (!(await mermaid.parse(code, { suppressErrors: true }))) return null;
  try {
    return (await mermaid.render(id, code)).svg;
  } catch {
    return null;
  }
}
