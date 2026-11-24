import { create } from "zustand";
import type { MessageDTO } from "../../../shared/events";
import type { Citation } from "../../lib/citations";

type Stream = {
  text: string;
  status: MessageDTO["status"];
  /** The query being searched right now, if any. */
  search?: string;
  citations?: Citation[];
};

type ChatStore = {
  streams: Record<string, Stream>;
  append: (id: string, text: string) => void;
  replace: (id: string, text: string) => void;
  setStatus: (id: string, status: MessageDTO["status"]) => void;
  searching: (id: string, query: string) => void;
  cite: (id: string, citations: Citation[]) => void;
  clear: (id: string) => void;
};

const empty: Stream = { text: "", status: "streaming" };

export const useChatStore = create<ChatStore>((set) => {
  const patch = (id: string, change: (s: Stream) => Partial<Stream>) =>
    set((s) => {
      const current = s.streams[id] ?? empty;
      return {
        streams: { ...s.streams, [id]: { ...current, ...change(current) } },
      };
    });
  return {
    streams: {},
    append: (id, text) =>
      patch(id, (s) => ({ text: s.text + text, status: "streaming" })),
    replace: (id, text) => patch(id, () => ({ text })),
    setStatus: (id, status) => patch(id, () => ({ status })),
    searching: (id, query) => patch(id, () => ({ search: query })),
    cite: (id, citations) =>
      patch(id, (s) => ({
        search: undefined,
        citations: [...(s.citations ?? []), ...citations],
      })),
    clear: (id) =>
      set((s) => {
        const { [id]: _, ...streams } = s.streams;
        return { streams };
      }),
  };
});
