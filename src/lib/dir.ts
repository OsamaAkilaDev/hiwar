const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;

// Majority script decides, so an Arabic paragraph that opens with "React"
// still reads right-to-left.
export const dirOf = (text: string): "rtl" | "ltr" =>
  (text.match(ARABIC)?.length ?? 0) > (text.match(LATIN)?.length ?? 0)
    ? "rtl"
    : "ltr";

export const dirProps = (text: string) => {
  const dir = dirOf(text);
  return dir === "rtl" ? { dir, lang: "ar" } : { dir };
};
