import mermaid from "mermaid";
import { type ReactNode, useEffect, useId, useState } from "react";

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Mermaid themes from the app's tokens, re-read on every render so a theme
// or accent switch redraws the diagram in the new colours.
function configure() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: getComputedStyle(document.body).fontFamily,
    themeVariables: {
      fontSize: "14px",
      background: css("--surface"),
      primaryColor: css("--surface-2"),
      primaryTextColor: css("--fg"),
      primaryBorderColor: css("--accent"),
      secondaryColor: css("--accent-soft"),
      tertiaryColor: css("--surface"),
      lineColor: css("--subtle"),
      textColor: css("--fg"),
      edgeLabelBackground: css("--surface"),
      clusterBkg: css("--surface"),
      clusterBorder: css("--line"),
    },
  });
}

const readTheme = () =>
  `${document.documentElement.dataset.theme}-${document.documentElement.dataset.accent}`;

/** The theme attributes the boot script and settings flip on <html>. */
function useThemeKey() {
  const [key, setKey] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setKey(readTheme()));
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme", "data-accent"],
    });
    return () => observer.disconnect();
  }, []);
  return key;
}

export default function Mermaid({
  code,
  fallback,
}: {
  code: string;
  fallback: ReactNode;
}) {
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const theme = useThemeKey();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      configure();
      // Small models often write invalid Mermaid: parse first, fall back to
      // the source instead of showing Mermaid's error graphic.
      const valid = await mermaid.parse(code, { suppressErrors: true });
      if (!valid) {
        if (alive) setFailed(true);
        return;
      }
      try {
        const { svg: out } = await mermaid.render(`${id}-${theme}`, code);
        if (alive) setSvg(out);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, id, theme]);

  if (failed) return <>{fallback}</>;
  if (!svg) return <div className="h-80" />;
  return (
    <div
      className="mermaid-svg flex justify-center overflow-x-auto"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid output in strict security mode (sanitized by its DOMPurify pass)
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
