import { create } from "zustand";
import { type Locale, resolveTheme, type Theme } from "./resolve-prefs";

const THEME_COLOR: Record<Theme, string> = {
  dark: "#0d0e10",
  light: "#fbfcfd",
};

const persist = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

type Prefs = {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

const html = document.documentElement;

export const usePrefs = create<Prefs>((set) => ({
  locale: html.lang === "ar" ? "ar" : "en",
  theme: resolveTheme(html.dataset.theme ?? null),
  setLocale: (locale) => {
    persist("hiwar.locale", locale);
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
    set({ locale });
  },
  setTheme: (theme) => {
    persist("hiwar.theme", theme);
    html.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLOR[theme]);
    set({ theme });
  },
}));
