# Architecture

Hiwar is one Cloudflare Worker. It serves the React SPA as static assets and the API under `/api`. Postgres (Neon) is reached through Hyperdrive; embeddings run on Workers AI.

```
src/        React SPA: routes, feature folders, i18n, styles
worker/     Hono API: routes, LLM gateway, memory, search, database
shared/     Code both sides import: SSE event schemas, stream parser, script detection
scripts/    eval.ts, the model and prompt evaluation harness
```

## One message, end to end

1. **Send.** The client creates both message ids (UUIDv7) and writes the user message and an empty assistant message into the Query cache, so the reply area shows at once. `POST /api/chat/stream` carries the ids, the text, the UI locale and the preferred model.
2. **Guard.** The route is rate-limited per IP (20 a minute) and the body is validated with zod (`shared/events.ts`). The user message id is an idempotency key, so a retry never duplicates it.
3. **Context.** In parallel: recent messages, profile facts, and memories nearest to the question by vector search (`worker/memory/retrieve.ts`, skipped for greetings and very short messages).
4. **Stream.** `worker/llm/gateway.ts` tries providers in order (the chosen model first, the other as fallback). A provider that fails before its first token, or rate-limits, hands over to the next one. Groq and Gemini share one OpenAI-compatible client; a mock provider streams canned replies for offline work.
5. **Search.** When the model calls `web_search`, the worker runs Tavily (up to 3 times a turn), trims the results and streams `tool_start` / `tool_result` events, which the UI shows as a chip and numbered citations.
6. **Render.** The client parses SSE from `fetch` (`shared/sse.ts`) and buffers deltas, flushing once per animation frame (`src/features/chat/stream/frame-flush.ts`). Only the streaming row re-renders.
7. **Finish.** The assistant message is written once, with status `complete`, `stopped` (Stop or disconnect) or `error`, and `done` returns the saved record that replaces the optimistic copy.
8. **After the reply.** A title is generated on the first turn. Every few turns, a cheap call extracts memory candidates from the user's own messages, which are embedded (`@cf/baai/bge-m3`, multilingual) and stored. Web content never writes to memory.

## Bilingual by construction

- Direction is decided per Markdown block by majority script (`src/lib/dir.ts`), so an Arabic paragraph that opens with an English term still reads right to left.
- Layout uses logical properties only; the whole UI mirrors from `dir` on the root.
- Code is always LTR and isolated. Arabic text gets its own fonts and line height.

## Visuals

The model writes a fenced block (`chart`, `plot`, `mermaid`, `dot`, `markmap`, `timeline`, `compare`, `proscons`, `cycle`, `tree`, `stepper`, `html`) inside its normal Markdown. `src/features/chat/visuals/spec.ts` validates JSON blocks with zod; anything invalid falls back to showing the code.

- Native blocks are drawn by the app's own components, in its tokens and motion.
- Mermaid, Graphviz and Markmap are lazy-loaded and themed from the same tokens. Graphviz output is sanitized with DOMPurify.
- Function plots compile the expression with a small parser (`expr.ts`), never `eval`.
- `html` runs only in an iframe with `sandbox="allow-scripts"` (no same origin), loaded through `srcdoc`.

## Data

Tables are defined in `worker/db/schema.ts`, with migrations in `worker/db/migrations`. Message ids are UUIDv7, so they sort by time and serve as the pagination cursor. Memory vectors use pgvector, and each row records the embedding model that produced it.

## Model choice

`scripts/eval.ts` runs a fixed Arabic, English and mixed test set against each candidate model; results are in `docs/evals/`. Gemini 3.5 Flash-Lite is the default (fastest first token, best Arabic). Groq's GPT-OSS 120B is the fallback.
