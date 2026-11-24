// The language is decided in code: left to the model, English questions
// sometimes came back with Arabic titles.
export function titlePrompt(lang: "ar" | "en"): string {
  const language =
    lang === "ar"
      ? "Arabic: natural, dialect-neutral everyday Arabic, not formal"
      : "English";
  return `Write a title of 2 to 6 words for the user's message, in ${language}, with natural, everyday wording. Reply with the title only: no quotes, no Markdown, no punctuation at the end.`;
}
