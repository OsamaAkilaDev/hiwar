import { streamChat } from "./gateway";
import { titlePrompt } from "./prompts/title";
import type { Provider } from "./types";

const MAX_LENGTH = 60;

export function cleanTitle(raw: string): string | null {
  const line = raw.trim().split("\n")[0] ?? "";
  let title = line
    .replace(/[*`]/g, "")
    .replace(/^[\s#>\-_"'“”‘’«»]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length > MAX_LENGTH) {
    const cut = title.slice(0, MAX_LENGTH + 1);
    const space = cut.lastIndexOf(" ");
    title = cut.slice(0, space > 0 ? space : MAX_LENGTH);
  }
  return title.replace(/[\s_"'“”‘’«».,;:!?؟،…]+$/, "") || null;
}

export async function generateTitle(
  providers: Provider[],
  firstUserText: string,
  signal: AbortSignal,
): Promise<string | null> {
  const startedAt = Date.now();
  let provider: Provider | undefined;
  let title: string | null = null;
  try {
    let raw = "";
    for await (const chunk of streamChat(
      providers,
      [
        { role: "system", content: titlePrompt() },
        { role: "user", content: firstUserText },
      ],
      { signal },
    )) {
      provider = chunk.provider;
      raw += chunk.text;
    }
    title = cleanTitle(raw);
  } catch (error) {
    if (!signal.aborted) console.error("chat.title failed", error);
  }
  console.log(
    JSON.stringify({
      route: "chat.title",
      provider: provider?.name,
      ms: Date.now() - startedAt,
      ok: title !== null,
    }),
  );
  return title;
}
