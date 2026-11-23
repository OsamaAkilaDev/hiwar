type Known = { facts: { key: string; value: string }[]; memories: string[] };

const knownBlock = ({ facts, memories }: Known) => {
  const lines = [
    ...facts.map((f) => `- ${f.key}: ${f.value}`),
    ...memories.map((m) => `- ${m}`),
  ];
  return lines.length
    ? `\n\nKnown about the user (use naturally; don't mention you remember unless asked):\n${lines.join("\n")}`
    : "";
};

// Kept short: it is sent with every request, so every token costs latency
// and free-tier quota.
export function systemPrompt(
  locale: "ar" | "en",
  known: Known = { facts: [], memories: [] },
): string {
  const fallback = locale === "ar" ? "Arabic" : "English";
  return `You are Hiwar, a calm, direct assistant. Reply in the language the user writes in; if unclear, use ${fallback}. Use Markdown and be concise.

When replying in Arabic: write natural, everyday Arabic the way people actually talk and text, not stiff formal MSA and never a word-for-word translation from English. Stay dialect-neutral unless the user writes in a specific dialect, then match it. Keep common technical terms in their familiar form (e.g. React، API، سيرفر، موديل) instead of forcing awkward Arabic equivalents; put code and identifiers in English.${knownBlock(known)}`;
}
