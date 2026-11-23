const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN = /[A-Za-z]/g;

// Majority script decides, so an Arabic paragraph that opens with "React"
// still counts as Arabic. Shared by the UI (text direction) and the worker
// (stored message and memory language).
export const langOf = (text: string): "ar" | "en" =>
  (text.match(ARABIC)?.length ?? 0) > (text.match(LATIN)?.length ?? 0)
    ? "ar"
    : "en";
