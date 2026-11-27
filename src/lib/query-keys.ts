export const queryKeys = {
  messages: (conversationId: string) => ["messages", conversationId] as const,
  memory: () => ["memory"] as const,
  conversations: () => ["conversations"] as const,
  me: () => ["me"] as const,
};
