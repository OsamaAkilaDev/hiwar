import type { MessageDTO } from "../../../shared/events";

export type ChatRow = MessageDTO & { error?: string; retryable?: boolean };
