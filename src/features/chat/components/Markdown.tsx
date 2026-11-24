import { marked } from "marked";
import { type ComponentProps, memo, useMemo } from "react";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "../../../i18n";
import { type Citation, linkCitations } from "../../../lib/citations";
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

// Model output can carry links from search results: every link opens in a
// new tab without handing the page a reference back. Citation markers
// (titled "cite" by linkCitations) render as small numbered chips.
function Link({
  node: _,
  href,
  title,
  children,
  ...rest
}: ComponentProps<"a"> & ExtraProps) {
  const t = useT();
  const cite = title === "cite";
  return (
    <a
      {...rest}
      href={href}
      title={cite ? undefined : title}
      target="_blank"
      rel="noopener noreferrer"
      className={cite ? "cite" : undefined}
      aria-label={cite ? t("source", { n: String(children) }) : undefined}
    >
      {children}
    </a>
  );
}

const components = { pre: CodeBlock, a: Link };

const Block = memo(function Block({ source }: { source: string }) {
  return (
    <div {...dirProps(source)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
});

const NO_CITATIONS: Citation[] = [];

// Split into top-level blocks so finished blocks never re-parse while the
// last one streams in. Unclosed fences and half tables stay in the last block.
export const Markdown = memo(function Markdown({
  text,
  citations = NO_CITATIONS,
}: {
  text: string;
  citations?: Citation[];
}) {
  const blocks = useMemo(
    () =>
      marked
        .lexer(text)
        .map((token) =>
          token.type === "code"
            ? token.raw
            : linkCitations(token.raw, citations),
        )
        .filter((raw) => raw.trim()),
    [text, citations],
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
