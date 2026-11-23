import { usePrefs } from "../lib/prefs";
import { ar } from "./ar";
import { en, type MessageKey } from "./en";

export type { MessageKey };

const dictionaries: Record<"ar" | "en", Record<MessageKey, string>> = {
  ar,
  en,
};

export const useT = () => {
  const dictionary = dictionaries[usePrefs((s) => s.locale)];
  return (key: MessageKey, vars?: Record<string, string>) =>
    dictionary[key].replace(
      /\{(\w+)\}/g,
      (match, name) => vars?.[name] ?? match,
    );
};
