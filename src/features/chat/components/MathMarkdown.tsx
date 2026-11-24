import "katex/dist/katex.min.css";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Loaded only for blocks that look like they contain math (KaTeX + fonts).
// Bad LaTeX renders as red source text instead of throwing.
export default function MathMarkdown({
  source,
  components,
}: {
  source: string;
  components: Components;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      components={components}
    >
      {source}
    </ReactMarkdown>
  );
}
