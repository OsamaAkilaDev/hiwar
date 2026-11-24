/** Cheap check before loading KaTeX: $, \( or \[ somewhere in the block. */
export const hasMath = (text: string) => /\$|\\\(|\\\[/.test(text);

// Models also write \( \) and \[ \]; remark-math only reads dollar fences.
export const normalizeMath = (text: string) =>
  text
    .replace(
      /\\\[([\s\S]+?)\\\]/g,
      (_, body: string) => `\n$$\n${body.trim()}\n$$\n`,
    )
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    // A line holding only $$…$$ is meant as display math; remark-math reads
    // the one-line form as inline, so it gets its own fence lines.
    .replace(
      /^[ \t]*\$\$([^$\n]+?)\$\$[ \t]*$/gm,
      (_, body: string) => `$$\n${body.trim()}\n$$`,
    );
