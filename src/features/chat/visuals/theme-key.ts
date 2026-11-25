import { useEffect, useState } from "react";

const read = () =>
  `${document.documentElement.dataset.theme}-${document.documentElement.dataset.accent}`;

/** Changes whenever the theme or accent on <html> flips, so renderers that
 * bake colours into their output can redraw. */
export function useThemeKey() {
  const [key, setKey] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setKey(read()));
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme", "data-accent"],
    });
    return () => observer.disconnect();
  }, []);
  return key;
}
