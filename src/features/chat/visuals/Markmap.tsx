import { ArrowsInIcon } from "@phosphor-icons/react";
import { Transformer } from "markmap-lib";
import { Markmap as View } from "markmap-view";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../../../i18n";
import { tokenColor as c } from "../../../lib/token-color";
import { downloadSvg, Fullscreen, StageButton, Toolbar } from "./Diagram";
import { Frame } from "./Frame";
import { useThemeKey } from "./theme-key";

const transformer = new Transformer();

// Branch colours: the accent, then tints of it toward the surface.
const palette = () =>
  [100, 70, 50, 35].map((pct) =>
    c(`color-mix(in oklab, var(--accent) ${pct}%, var(--surface))`),
  );

/** A live, collapsible mind map; it zooms and pans on its own. */
function useMarkmap(code: string, active: boolean) {
  const ref = useRef<SVGSVGElement>(null);
  const view = useRef<View | null>(null);
  const theme = useThemeKey();
  const { root } = useMemo(() => transformer.transform(code), [code]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: theme redraws in new colours
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !active) return;
    const colors = palette();
    svg.style.setProperty("--markmap-text-color", c("--fg"));
    const mm = View.create(
      svg,
      {
        autoFit: true,
        duration: 300,
        maxWidth: 260,
        paddingX: 12,
        spacingVertical: 8,
        color: (node) =>
          colors[(node.state?.depth ?? 0) % colors.length] ?? "currentColor",
      },
      root,
    );
    view.current = mm;
    return () => {
      mm.destroy();
      svg.replaceChildren();
    };
  }, [root, active, theme]);

  return { ref, view };
}

export default function Markmap({
  code,
  dir,
  fallback,
}: {
  code: string;
  dir: "rtl" | "ltr";
  fallback: () => ReactNode;
}) {
  const t = useT();
  const [source, setSource] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inline = useMarkmap(code, !source);
  const full = useMarkmap(code, expanded);

  return (
    <Frame
      dir={dir}
      action={
        <Toolbar
          code={code}
          source={source}
          onSource={() => setSource(!source)}
          onDownload={() => {
            const svg = inline.ref.current;
            if (svg) downloadSvg(svg.outerHTML, "mindmap");
          }}
          onExpand={() => setExpanded(true)}
        />
      }
    >
      {source ? (
        fallback()
      ) : (
        <svg ref={inline.ref} direction="ltr" className="markmap h-80 w-full" />
      )}
      <Fullscreen
        open={expanded}
        onClose={() => setExpanded(false)}
        controls={
          <StageButton
            label={t("visual.fit")}
            onClick={() => full.view.current?.fit()}
          >
            <ArrowsInIcon className="size-4.5" aria-hidden />
          </StageButton>
        }
      >
        <svg ref={full.ref} direction="ltr" className="markmap size-full" />
      </Fullscreen>
    </Frame>
  );
}
