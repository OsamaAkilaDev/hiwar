export const en = {
  emptyHeading: "How can I help?",
  composerLabel: "Message",
  composerPlaceholder: "Message Hiwar",
  send: "Send message",
  stop: "Stop reply",
  thinking: "Thinking",
  stopped: "Stopped",
  noResponse: "No response.",
  offline: "You're offline.",
  loadFailed: "Couldn't load this conversation.",
  retry: "Retry",
  newChat: "New chat",
  loading: "Loading conversation",
  languageName: "English",
  switchLanguage: "Switch to Arabic",
  darkTheme: "Dark theme",
  "error.unavailable":
    "No model is available right now. Try again in a moment.",
  "error.cut_off": "The reply was cut off.",
  "error.connection": "Connection lost. Check your network and try again.",
  "error.server": "Couldn't reach Hiwar's server. Try again.",
  "error.rate_limited": "Too many messages. Wait a minute, then try again.",
  "error.incomplete": "This reply didn't finish.",
  "error.rename": "Couldn't rename this chat. Try again.",
  "error.delete": "Couldn't delete this chat. Try again.",
} as const;

export type MessageKey = keyof typeof en;
