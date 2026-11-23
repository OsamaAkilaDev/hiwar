import type { ChatMessage, Provider } from "../types";

const CHUNK_SIZE = 8;
const CHUNK_DELAY_MS = 30;
const SLOW_DELAY_MS = 4000;

const ANSWER = `React هي مكتبة جافاسكريبت لبناء واجهات المستخدم من مكونات صغيرة قابلة لإعادة الاستخدام.

React is a JavaScript library for building user interfaces out of small, reusable components.

\`\`\`chart
{ "kind": "bar", "title": "Weekly downloads (millions)", "data": [{ "label": "React", "value": 25 }, { "label": "Vue", "value": 5 }, { "label": "Svelte", "value": 1 }] }
\`\`\`

\`\`\`ts
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
\`\`\`
`;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function mockProvider(): Provider {
  return {
    name: "mock",
    model: "mock",
    async *stream(messages: ChatMessage[], signal: AbortSignal) {
      const last = messages.findLast((m) => m.role === "user")?.content;
      if (last === "/fail") throw new Error("mock failure");
      if (last === "/slow") await sleep(SLOW_DELAY_MS, signal);

      for (let i = 0, n = 0; i < ANSWER.length; i += CHUNK_SIZE, n++) {
        if (signal.aborted) return;
        if (last === "/fail-mid" && n === 3) throw new Error("mock failure");
        yield ANSWER.slice(i, i + CHUNK_SIZE);
        await sleep(CHUNK_DELAY_MS, signal);
      }
    },
  };
}
