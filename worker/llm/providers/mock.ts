import { extractPrompt } from "../prompts/extract-memory";
import { titlePrompt } from "../prompts/title";
import type { ChatMessage, Provider, Tool } from "../types";

const CHUNK_SIZE = 8;
const CHUNK_DELAY_MS = 30;
const SLOW_DELAY_MS = 2000;

const FENCE = "```";

const ANSWER = `React هي مكتبة جافاسكريبت لبناء واجهات المستخدم من مكونات صغيرة قابلة لإعادة الاستخدام.

React is a JavaScript library for building user interfaces out of small, reusable components.

${FENCE}chart
{"kind":"bar","title":"Weekly downloads","unit":"M","data":[{"label":"React","value":25},{"label":"Vue","value":5},{"label":"Svelte","value":1}]}
${FENCE}

How a render flows:

${FENCE}mermaid
flowchart TD
  A["State changes"] --> B["Component re-renders"]
  B --> C{"Output changed?"}
  C -- yes --> D["DOM updated"]
  C -- no --> E["Nothing to do"]
${FENCE}

${FENCE}stepper
{ "title": "Start a project", "steps": [{ "title": "Create the app", "body": "Run bun create vite and pick React." }, { "title": "Install", "body": "bun install pulls the dependencies." }, { "title": "Run it", "body": "bun dev starts the dev server." }] }
${FENCE}

${FENCE}chart
{"kind":"line","title":"Stars over time","unit":"k","data":[{"label":"2019","value":140},{"label":"2020","value":165},{"label":"2021","value":190},{"label":"2022","value":205},{"label":"2023","value":220},{"label":"2024","value":232}]}
${FENCE}

${FENCE}chart
{"kind":"donut","title":"Where time goes","data":[{"label":"Rendering","value":45},{"label":"Scripting","value":30},{"label":"Layout","value":15},{"label":"Idle","value":10}]}
${FENCE}

${FENCE}ts
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
${FENCE}
`;

const EXTRACTION = `\`\`\`json
{"facts":[{"key":"preferred_language","value":"TypeScript"}],"memories":[{"content":"Prefers TypeScript examples over JavaScript.","importance":0.7}]}
\`\`\``;

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
    tools: true,
    async *stream(
      messages: ChatMessage[],
      signal: AbortSignal,
      tools?: Tool[],
    ) {
      const last = messages.findLast((m) => m.role === "user")?.content;
      if (messages[0]?.content === titlePrompt()) {
        yield /[؀-ۿ]/.test(last ?? "")
          ? "شرح أساسيات React"
          : "Explaining React basics";
        return;
      }
      if (messages[0]?.content === extractPrompt()) {
        yield EXTRACTION;
        return;
      }
      // Any message mentioning "search" asks for one search before answering.
      const searched = messages.some((m) => m.role === "tool");
      if (
        tools?.length &&
        !searched &&
        last?.toLowerCase().includes("search")
      ) {
        yield {
          id: "call_mock",
          name: "web_search",
          args: JSON.stringify({ query: last }),
        };
        return;
      }
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
