export const queryKeys = {
  messages: (conversationId: string) => ["messages", conversationId] as const,
};
