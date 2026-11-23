import { langOf } from "../../shared/lang";

export const dirOf = (text: string): "rtl" | "ltr" =>
  langOf(text) === "ar" ? "rtl" : "ltr";

export const dirProps = (text: string) => {
  const dir = dirOf(text);
  return dir === "rtl" ? { dir, lang: "ar" } : { dir };
};
