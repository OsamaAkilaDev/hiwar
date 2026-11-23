export type Locale = "ar" | "en";
export type Theme = "dark" | "light";

export const resolveLocale = ({
  saved,
  languages,
}: {
  saved: string | null;
  languages: readonly string[];
}): Locale => {
  if (saved === "ar" || saved === "en") return saved;
  return languages.some((l) => l.toLowerCase().startsWith("ar")) ? "ar" : "en";
};

export const resolveTheme = (saved: string | null): Theme =>
  saved === "light" ? "light" : "dark";
