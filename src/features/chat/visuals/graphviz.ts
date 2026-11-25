import { instance } from "@viz-js/viz";
import DOMPurify from "dompurify";
import { tokenColor as c } from "../../../lib/token-color";

// The WebAssembly build (~1.4 MB) starts once and is reused.
let viz: ReturnType<typeof instance> | undefined;

/** SVG markup, or null when the code isn't valid DOT. */
export async function render(code: string): Promise<string | null> {
  viz ??= instance();
  const font =
    getComputedStyle(document.body)
      .fontFamily.split(",")[0]
      ?.replace(/"/g, "")
      .trim() ?? "sans-serif";
  const fg = c("--fg");
  const line = c("--subtle");
  try {
    const svg = (await viz).renderString(code, {
      format: "svg",
      // Defaults from the app's tokens; anything the DOT sets wins.
      graphAttributes: {
        bgcolor: "transparent",
        fontname: font,
        fontcolor: fg,
        pad: "0.2",
        nodesep: "0.4",
        ranksep: "0.5",
      },
      nodeAttributes: {
        shape: "box",
        style: "rounded,filled",
        fillcolor: c("--surface-2"),
        color: c("--accent"),
        fontname: font,
        fontcolor: fg,
        fontsize: "12",
        margin: "0.2,0.1",
      },
      edgeAttributes: {
        color: line,
        fontname: font,
        fontcolor: c("--muted"),
        fontsize: "11",
        arrowsize: "0.7",
      },
    });
    // DOT can carry links (URL, href) into the SVG: sanitize like Mermaid.
    return DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  } catch {
    return null;
  }
}
