import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { dirProps } from "../../../lib/dir";

const Block = memo(function Block({ source }: { source: string }) {
  return (
    <div {...dirProps(source)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
});

// Split into top-level blocks so finished blocks never re-parse while the
// last one streams in. Unclosed fences and half tables stay in the last block.
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const blocks = useMemo(
    () =>
      marked
        .lexer(text)
        .map((token) => token.raw)
        .filter((raw) => raw.trim()),
    [text],
  );
  return (
    <div className="prose-chat">
      {blocks.map((raw, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blocks only ever append
        <Block key={i} source={raw} />
      ))}
    </div>
  );
});
