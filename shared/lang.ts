const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;

export const langOf = (text: string): "ar" | "en" =>
  (text.match(ARABIC)?.length ?? 0) > (text.match(LATIN)?.length ?? 0)
    ? "ar"
    : "en";
