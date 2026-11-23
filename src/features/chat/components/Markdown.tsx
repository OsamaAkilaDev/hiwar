import { marked } from "marked";
import { type ComponentProps, memo, useMemo } from "react";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { dirProps } from "../../../lib/dir";
import { CopyButton } from "./CopyButton";

// Fenced code gets a header with the language and a copy button.
function CodeBlock({ node, children }: ComponentProps<"pre"> & ExtraProps) {
  const code = node?.children[0];
  const el = code?.type === "element" ? code : undefined;
  const text =
    el?.children.map((c) => (c.type === "text" ? c.value : "")).join("") ?? "";
  const classes = el?.properties.className;
  const language = Array.isArray(classes)
    ? String(
        classes.find((c) => String(c).startsWith("language-")) ?? "",
      ).slice(9)
    : "";
  return (
    <div className="code">
      <div className="flex h-8 items-center justify-between border-line border-b ps-3.5 pe-1.5 text-subtle text-xs">
        <span className="font-mono">{language}</span>
        <CopyButton
          text={text.replace(/\n$/, "")}
          label="copyCode"
          className="size-6.5 rounded-md"
        />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const Block = memo(function Block({ source }: { source: string }) {
  return (
    <div {...dirProps(source)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ pre: CodeBlock }}
      >
        {source}
      </ReactMarkdown>
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
