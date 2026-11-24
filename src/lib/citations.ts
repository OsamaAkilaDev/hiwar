export type Citation = { title: string; url: string };

// Turns the model's inline markers ("[2]", "[1, 3]") into Markdown links
// titled "cite", which the renderer draws as small numbered chips. The
// lookbehind skips indexing like arr[1]; a marker without a source stays text.
export const linkCitations = (text: string, citations: Citation[]) =>
  citations.length
    ? text.replace(
        /(?<![\w\]`])\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g,
        (raw, list) => {
          const links = (list as string).split(",").map((s) => {
            const n = Number(s.trim());
            const source = citations[n - 1];
            return source ? `[${n}](${source.url} "cite")` : null;
          });
          return links.every(Boolean) ? links.join("") : raw;
        },
      )
    : text;

/** Source numbers the text cites, in first-use order. */
export const citedIn = (text: string) => {
  const seen = new Set<number>();
  for (const [, list = ""] of text.matchAll(
    /(?<![\w\]`])\[(\d+(?:\s*,\s*\d+)*)\]/g,
  )) {
    for (const n of list.split(",")) seen.add(Number(n.trim()));
  }
  return [...seen];
};

export const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
