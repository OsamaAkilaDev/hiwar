import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const background = "#0d0e10";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  // PWA/apple icons need a solid tile; the tab favicon is favicon-light/dark.svg, picked by media query in index.html.
  images: ["public/app-icon.svg"],
});
