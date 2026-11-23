export type Locale = "ar" | "en";
export type LocaleSetting = Locale | "auto";
export type Theme = "dark" | "light" | "system";
export type Accent = "teal" | "saffron";

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

export const resolveLocaleSetting = (saved: string | null): LocaleSetting =>
  saved === "ar" || saved === "en" ? saved : "auto";

export const resolveTheme = (saved: string | null): Theme =>
  saved === "light" || saved === "system" ? saved : "dark";

// The palette actually painted: "system" follows the OS.
export const paletteOf = (theme: Theme, prefersDark: boolean) =>
  theme === "system" ? (prefersDark ? "dark" : "light") : theme;

export const resolveAccent = (saved: string | null): Accent =>
  saved === "saffron" ? "saffron" : "teal";
