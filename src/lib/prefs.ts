import { create } from "zustand";
import {
  type Accent,
  type Locale,
  type LocaleSetting,
  type Model,
  paletteOf,
  resolveAccent,
  resolveLocale,
  resolveLocaleSetting,
  resolveModel,
  resolveTheme,
  type Theme,
} from "./resolve-prefs";

const THEME_COLOR = { dark: "#17171a", light: "#fbfbfc" };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const persist = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
};

type Prefs = {
  locale: Locale;
  localeSetting: LocaleSetting;
  theme: Theme;
  /** The palette on screen; differs from `theme` only for "system". */
  palette: "dark" | "light";
  accent: Accent;
  name: string;
  memory: boolean;
  model: Model;
  setLocale: (setting: LocaleSetting) => void;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  setName: (name: string) => void;
  setMemory: (on: boolean) => void;
  setModel: (model: Model) => void;
};

const html = document.documentElement;
const scheme = matchMedia("(prefers-color-scheme: dark)");

// Skips transitions for one frame so a theme change doesn't animate every color.
const paint = (palette: "dark" | "light") => {
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(freeze);
  html.dataset.theme = palette;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[palette]);
  getComputedStyle(document.body).opacity;
  requestAnimationFrame(() => freeze.remove());
};

export const usePrefs = create<Prefs>((set) => ({
  locale: html.lang === "ar" ? "ar" : "en",
  localeSetting: resolveLocaleSetting(read("hiwar.locale")),
  theme: resolveTheme(read("hiwar.theme")),
  palette: html.dataset.theme === "light" ? "light" : "dark",
  accent: resolveAccent(read("hiwar.accent")),
  name: read("hiwar.name") ?? "",
  memory: read("hiwar.memory") !== "off",
  model: resolveModel(read("hiwar.model")),
  setLocale: (setting) => {
    persist("hiwar.locale", setting === "auto" ? null : setting);
    const locale =
      setting === "auto"
        ? resolveLocale({ saved: null, languages: navigator.languages })
        : setting;
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
    set({ locale, localeSetting: setting });
  },
  setTheme: (theme) => {
    persist("hiwar.theme", theme);
    const palette = paletteOf(theme, scheme.matches);
    paint(palette);
    set({ theme, palette });
  },
  setAccent: (accent) => {
    persist("hiwar.accent", accent);
    html.dataset.accent = accent;
    set({ accent });
  },
  setName: (value) => {
    const name = value.trim().slice(0, 40);
    persist("hiwar.name", name || null);
    set({ name });
  },
  setMemory: (memory) => {
    persist("hiwar.memory", memory ? "on" : "off");
    set({ memory });
  },
  setModel: (model) => {
    persist("hiwar.model", model);
    set({ model });
  },
}));

scheme.addEventListener("change", () => {
  const { theme } = usePrefs.getState();
  if (theme !== "system") return;
  const palette = paletteOf(theme, scheme.matches);
  paint(palette);
  usePrefs.setState({ palette });
});
