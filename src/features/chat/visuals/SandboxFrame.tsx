import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_HEIGHT = 224;
const MAX_HEIGHT = 600;
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:";

const TOKENS = [
  "--bg",
  "--surface",
  "--surface-2",
  "--line",
  "--fg",
  "--muted",
  "--accent",
  "--accent-soft",
];

// Tier 2: model-written HTML runs only here. sandbox="allow-scripts" without
// allow-same-origin gives the frame an opaque origin: no cookies, storage,
// or access to this page. The CSP blocks every network request. The only
// thing it can send out is its own height, which we read and clamp. It grows
// past the default when content overflows; it never shrinks below it.
export function SandboxFrame({ code, title }: { code: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  const doc = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const vars = TOKENS.map((t) => `${t}:${style.getPropertyValue(t)}`).join(
      ";",
    );
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>:root{${vars}}html,body{margin:0;background:transparent;}body{color:var(--fg);font:14px/1.5 system-ui,sans-serif}</style></head><body>${code}<script>function s(){parent.postMessage({hiwarHeight:document.documentElement.scrollHeight},"*")}addEventListener("load",s);new ResizeObserver(s).observe(document.documentElement)</script></body></html>`;
  }, [code]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      const h = Number((event.data as { hiwarHeight?: unknown })?.hiwarHeight);
      if (Number.isFinite(h) && h > DEFAULT_HEIGHT)
        setHeight(Math.min(Math.ceil(h), MAX_HEIGHT));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-scripts"
      srcDoc={doc}
      style={{ height }}
      className="block w-full border-0"
    />
  );
}
