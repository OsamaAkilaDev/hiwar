export function systemPrompt(locale: "ar" | "en"): string {
  const fallback = locale === "ar" ? "Arabic" : "English";
  return `You are a helpful assistant. Reply in the language the user writes in; if it is unclear, reply in ${fallback}. Use Markdown. Be concise.`;
}
