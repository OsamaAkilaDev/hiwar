import type { MessageKey } from "./en";

export const ar: Record<MessageKey, string> = {
  emptyHeading: "كيف يمكنني المساعدة؟",
  composerLabel: "الرسالة",
  composerPlaceholder: "رسالة إلى حوار",
  send: "إرسال الرسالة",
  stop: "إيقاف الرد",
  thinking: "جارٍ التفكير",
  stopped: "تم الإيقاف",
  noResponse: "لا يوجد رد.",
  retry: "إعادة المحاولة",
  newChat: "محادثة جديدة",
  loading: "جارٍ تحميل المحادثة",
  languageName: "العربية",
  switchLanguage: "التبديل إلى الإنجليزية",
  darkTheme: "الوضع الداكن",
  "error.unavailable": "لا يتوفر نموذج حالياً. أعد المحاولة بعد قليل.",
  "error.cut_off": "انقطع الرد قبل اكتماله.",
  "error.connection": "انقطع الاتصال. تحقّق من الشبكة وأعد المحاولة.",
  "error.server": "تعذّر الوصول إلى خادم حوار. أعد المحاولة.",
  "error.rate_limited":
    "رسائل كثيرة خلال وقت قصير. انتظر دقيقة ثم أعد المحاولة.",
  "error.incomplete": "لم يكتمل هذا الرد.",
};
