import { create } from "zustand";
import type { MessageDTO } from "../../../shared/events";

type Stream = { text: string; status: MessageDTO["status"] };

type ChatStore = {
  streams: Record<string, Stream>;
  append: (id: string, text: string) => void;
  setStatus: (id: string, status: MessageDTO["status"]) => void;
  clear: (id: string) => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  streams: {},
  append: (id, text) =>
    set((s) => ({
      streams: {
        ...s.streams,
        [id]: { text: (s.streams[id]?.text ?? "") + text, status: "streaming" },
      },
    })),
  setStatus: (id, status) =>
    set((s) => ({
      streams: {
        ...s.streams,
        [id]: { text: s.streams[id]?.text ?? "", status },
      },
    })),
  clear: (id) =>
    set((s) => {
      const { [id]: _, ...streams } = s.streams;
      return { streams };
    }),
}));
