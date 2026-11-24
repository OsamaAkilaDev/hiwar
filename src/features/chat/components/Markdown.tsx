import { marked } from "marked";
import { type ComponentProps, lazy, memo, Suspense, useMemo } from "react";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "../../../i18n";
import { type Citation, linkCitations } from "../../../lib/citations";
import { dirOf, dirProps } from "../../../lib/dir";
import { hasMath, normalizeMath } from "../../../lib/math";
import { isClosedFence, isVisualLang, type VisualLang } from "../visuals/spec";
import { Visual } from "../visuals/Visual";
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

// KaTeX (~75 KB + fonts) loads the first time a block contains math; until
// then the block renders as plain Markdown. Code fences never count as math.
const MathMarkdown = lazy(() => import("./MathMarkdown"));

const Block = memo(function Block({ source }: { source: string }) {
  const plain = (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
  const math = !/^s*(```|~~~)/.test(source) && hasMath(source);
  return (
    <div {...dirProps(source)}>
      {math ? (
        <Suspense fallback={plain}>
          <MathMarkdown
            source={normalizeMath(source)}
            components={components}
          />
        </Suspense>
      ) : (
        plain
      )}
    </div>
  );
});

const NO_CITATIONS: Citation[] = [];

type Item =
  | { kind: "md"; raw: string }
  | { kind: "visual"; raw: string; lang: VisualLang; code: string };

// Split into top-level blocks so finished blocks never re-parse while the
// last one streams in. Unclosed fences and half tables stay in the last block.
// Fences tagged chart, mermaid, stepper or html become visuals.
export const Markdown = memo(function Markdown({
  text,
  citations = NO_CITATIONS,
}: {
  text: string;
  citations?: Citation[];
}) {
  const items = useMemo(
    () =>
      marked
        .lexer(text)
        .filter((token) => token.raw.trim())
        .map((token): Item => {
          if (token.type !== "code") {
            return { kind: "md", raw: linkCitations(token.raw, citations) };
          }
          // Models sometimes put the spec on the fence line ("```chart {…}");
          // the info string then holds the start of the code.
          const info = String(token.lang ?? "").trim();
          const lang = info.split(/\s/)[0]?.toLowerCase() ?? "";
          const inline = info.slice(lang.length).trim();
          return isVisualLang(lang)
            ? {
                kind: "visual",
                raw: token.raw,
                lang,
                code: inline ? `${inline}\n${token.text}` : token.text,
              }
            : { kind: "md", raw: token.raw };
        }),
    [text, citations],
  );
  const dir = dirOf(text);
  return (
    <div className="prose-chat">
      {items.map((item, i) =>
        item.kind === "visual" ? (
          <Visual
            // biome-ignore lint/suspicious/noArrayIndexKey: blocks only ever append
            key={i}
            lang={item.lang}
            code={item.code}
            closed={isClosedFence(item.raw)}
            dir={dir}
            fallback={() => <Block source={item.raw} />}
          />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: blocks only ever append
          <Block key={i} source={item.raw} />
        ),
      )}
    </div>
  );
});
