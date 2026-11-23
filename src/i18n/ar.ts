import type { MessageKey } from "./en";

// Everyday, dialect-agnostic Arabic (the register Arab apps use), not formal
// MSA and not a literal translation; tech loanwords where they read better.
export const ar: Record<MessageKey, string> = {
  emptyHeading: "كيف أقدر أساعدك؟",
  composerLabel: "رسالتك",
  composerPlaceholder: "اسأل حوار أي شي",
  send: "إرسال",
  stop: "إيقاف الرد",
  thinking: "يفكّر…",
  stopped: "توقّف الرد",
  noResponse: "ما وصل رد.",
  retry: "جرّب مرة ثانية",
  newChat: "محادثة جديدة",
  loading: "جاري تحميل المحادثة",
  languageName: "العربية",
  switchLanguage: "غيّر اللغة للإنجليزي",
  darkTheme: "الوضع الليلي",
  "error.unavailable": "ما في موديل متاح حالياً. جرّب بعد شوي.",
  "error.cut_off": "انقطع الرد قبل ما يكمل.",
  "error.connection": "انقطع الاتصال. تأكد من الإنترنت وجرّب مرة ثانية.",
  "error.server": "ما قدرنا نوصل للسيرفر. جرّب مرة ثانية.",
  "error.rate_limited": "أرسلت رسائل كثيرة بسرعة. انتظر دقيقة وجرّب مرة ثانية.",
  "error.incomplete": "الرد ما اكتمل.",
};
