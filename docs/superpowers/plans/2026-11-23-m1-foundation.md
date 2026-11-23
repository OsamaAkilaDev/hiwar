# M1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a message, watch the reply stream in (mock or Gemini), press Stop, refresh and see the conversation persisted.

**Architecture:** One Vite project built with `@cloudflare/vite-plugin`: `src/` is the React SPA, `worker/` is the Hono API on `/api/*`, `shared/` holds Zod contracts both import. One Worker deploy serves both. Postgres (Neon) through Hyperdrive via Drizzle.

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router/Query, Zustand, Tailwind v4, Hono, Zod, Drizzle + `postgres`, `openai` SDK, `uuid` (v7), `react-markdown` + `remark-gfm` + `marked` (lexer only). Bun = package manager + script runner + test runner (`bun test`). Runtime is still workerd (Workers), not Bun. GitHub Actions for CI/CD.

**Spec:** `docs/architecture.md` + `docs/superpowers/specs/2026-11-23-bilingual-chat-design.md`

## Plan deltas vs spec (approved with this plan)

- **Single package, not pnpm workspaces.** One Worker = one Vite app; `shared/` is a folder. No workspace tooling needed.
- **Message persistence moves into M1** (conversations + messages tables). Without it, Step 3/8/10 of the message flow would be throwaway code. Sidebar, prefetch, titles stay in M3.
- **Gateway in M1 = ordered provider list + first-token timeout.** Cooldowns (KV) and capability table wait until a second real provider lands.

## Prerequisites (user)

- Neon project with a `dev` branch → `DATABASE_URL` (pooled off).
- Gemini API key from Google AI Studio → `GEMINI_API_KEY`.
- Both go in `.dev.vars` (git-ignored).
- Bun installed. Cloudflare account + API token (Workers edit) → GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Production secrets via `wrangler secret put GEMINI_API_KEY`; Hyperdrive config created in Task 3 (`wrangler hyperdrive create`).

## Global Constraints

- `wrangler.jsonc`: `compatibility_date` ≥ `2026-11-17`, `compatibility_flags: ["nodejs_compat"]`, assets `not_found_handling: "single-page-application"`, `run_worker_first: ["/api/*"]`.
- API keys only in Worker env; never in `src/`.
- Logical Tailwind utilities only (`ms-/me-/ps-/pe-/text-start`), never `ml-/mr-/pl-/pr-/text-left`.
- Message ids: client-generated UUIDv7. Every SSE event carries `messageId` + `seq`.
- No `setState` per token; flush once per animation frame.
- Markdown: no raw HTML (no `rehype-raw`), default `urlTransform`.
- Default provider in dev: `mock` (`LLM_PROVIDERS=mock` in `.dev.vars`).
- Commits: short human messages, no AI attribution.
- Every push to `main` deploys only if typecheck + tests pass.

## Review Focus

1. Arabic multi-byte char split across two network chunks → decoded correctly (Task 2 test).
2. Same `userMessageId` posted twice (retry/double click) → one row, no duplicate reply (Task 3 test).
3. Stop pressed before first token → assistant saved `stopped`, UI leaves skeleton state (Task 5 curl + Task 7 manual).
4. Provider dies after partial text → partial kept, status `error`, retry offered (Task 4 test, Task 5 behavior).
5. Two SSE events in one chunk, or one event across chunks → both parsed in order (Task 2 test).

---

### Task 1: Scaffold the Worker + SPA, GitHub, CI/CD

**Files:** Create `package.json`, `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles/app.css`, `worker/index.ts`, `.gitignore`, `.dev.vars.example`, `.github/workflows/ci.yml`.

CI (`ci.yml`): on PR and push to `main` → `oven-sh/setup-bun` → `bun install --frozen-lockfile` → `bun run typecheck` → `bun test` → `bun run build`. Job `deploy` (`needs: check`, only on push to `main`) → `cloudflare/wrangler-action` `deploy`.

**Interfaces:**

- Produces: `worker/index.ts` exports `default` Hono app typed `Hono<{ Bindings: Env }>`; `Env` = `{ HYPERDRIVE: Hyperdrive; GEMINI_API_KEY: string; GEMINI_MODEL: string; LLM_PROVIDERS: string }` (generated via `wrangler types`).

- [ ] **Step 1:** `git init`; scaffold with `bun create cloudflare@latest . --framework=react` (Vite + Worker template), then add Hono, Tailwind v4 (`@tailwindcss/vite`), TanStack Router plugin.
- [ ] **Step 2:** `GET /api/health` → `{ ok: true }`.
- [ ] **Step 3:** Run `bun dev`; `curl localhost:5173/api/health` → `{"ok":true}`; `/` serves the SPA; `/anything` serves the SPA (fallback).
- [ ] **Step 4:** Commit `scaffold worker and spa`; `gh repo create` (public), push; add the two Cloudflare secrets; confirm the Actions run deploys and `https://<worker>.workers.dev/api/health` returns `{"ok":true}`.

### Task 2: SSE contract + codec

**Files:** Create `shared/events.ts`, `shared/sse.ts`, `shared/sse.test.ts`.

**Interfaces:**

- Produces:
  - `ChatStreamRequest` Zod: `{ conversationId: uuid, userMessageId: uuid, assistantMessageId: uuid, text: string(1..8000), locale: "ar"|"en" }`.
  - `StreamEvent` Zod discriminated union on `type`: `start`, `delta {text}`, `tool_start {name, query}`, `tool_result {citations: {title,url}[]}`, `title {title}`, `done {message: MessageDTO}`, `error {message, retryable: boolean}`; all with `messageId`, `seq: number`.
  - `MessageDTO`: `{ id, conversationId, role: "user"|"assistant", content, status: "streaming"|"complete"|"stopped"|"error", createdAt: string }`.
  - `encodeEvent(e: StreamEvent): string` → `data: <json>\n\n`.
  - `parseEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent>` (uses `TextDecoderStream`, buffers until `\n\n`).

- [ ] **Step 1: Failing tests** in `shared/sse.test.ts`:
  - `parses two events delivered in one chunk` → yields both, in order.
  - `parses one event split across three chunks`.
  - `decodes Arabic split mid-character`: encode `delta {text:"مرحبا"}`, split the bytes inside a 2-byte char → yields `"مرحبا"`.
- [ ] **Step 2:** `bun test shared` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** → PASS. Commit `sse contract and codec`.

### Task 3: Database schema + message queries

**Files:** Create `worker/db/schema.ts`, `worker/db/client.ts`, `worker/db/messages.ts`, `drizzle.config.ts`, `worker/db/migrations/*` (generated), `worker/db/messages.test.ts`.

**Interfaces:**

- Produces:
  - Tables per spec §4: `users`, `conversations`, `messages` (M1 columns: `id uuid pk, conversation_id, role, content, parts jsonb default '[]', status, provider, model, lang, token_count, created_at`). Index `messages(conversation_id, id)`, `conversations(user_id, last_message_at desc)`. Seed one user with fixed id `SEED_USER_ID` exported from `schema.ts`.
  - `db(env: Env)` → Drizzle instance on `env.HYPERDRIVE.connectionString` (create per request; Hyperdrive pools).
  - `insertUserMessage(db, {conversationId, id, text, lang}): Promise<{ inserted: boolean }>` — upserts conversation (`on conflict do nothing`), inserts message `on conflict (id) do nothing`.
  - `recentMessages(db, conversationId, limit = 20): Promise<MessageDTO[]>` — ascending by id.
  - `saveAssistantMessage(db, {id, conversationId, content, status, provider, model}): Promise<MessageDTO>` — insert, updates `conversations.last_message_at`.
  - `listMessages(db, conversationId, {before?: string, limit = 50})` — keyset on `id`.

- [ ] **Step 1:** `bunx drizzle-kit generate` → migration; `bunx drizzle-kit migrate` against Neon dev branch; seed user.
- [ ] **Step 2: Failing test** (runs only when `DATABASE_URL` set): `insertUserMessage twice with same id → second returns inserted:false and one row exists`.
- [ ] **Step 3:** Implement → PASS. Commit `message persistence`.

### Task 4: LLM providers + gateway

**Files:** Create `worker/llm/types.ts`, `worker/llm/providers/mock.ts`, `worker/llm/providers/openai-compatible.ts`, `worker/llm/gateway.ts`, `worker/llm/gateway.test.ts`, `worker/llm/prompts/system.ts`.

**Interfaces:**

- Produces:
  - `ChatMessage = { role: "system"|"user"|"assistant"; content: string }`.
  - `Provider = { name: string; model: string; stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string> }`.
  - `mockProvider(): Provider` — streams a canned bilingual markdown answer (Arabic paragraph starting with "React", English paragraph, a ```chart fence, a code block) in ~8-char chunks every 30 ms. Magic user text: `/slow` → 4 s before first chunk; `/fail` → throws before first chunk; `/fail-mid` → throws after 3 chunks.
  - `openAICompatible({ name, baseURL, apiKey, model }): Provider` — `openai` SDK `chat.completions.create({ stream: true }, { signal })`, yields `choices[0].delta.content`.
  - `providersFromEnv(env): Provider[]` — reads `LLM_PROVIDERS` (comma list: `mock`, `gemini`); Gemini baseURL `https://generativelanguage.googleapis.com/v1beta/openai/`, model `env.GEMINI_MODEL`.
  - `streamChat(providers, messages, { signal, firstTokenTimeoutMs = 3000 }): AsyncGenerator<{ provider: Provider; text: string }>` — tries providers in order; moves to next on throw or timeout **before** first chunk; after first chunk, errors propagate.
  - `systemPrompt(locale): string` — answer in the user's language; markdown; keep visuals out of M1.

- [ ] **Step 1: Failing tests** in `gateway.test.ts` with fake providers:
  - `falls through when first provider throws before first token`.
  - `falls through when first provider exceeds firstTokenTimeoutMs` (timeout 50 ms in test, real timers).
  - `does not fall through after first token` → rejects with the original error, yielded text preserved.
- [ ] **Step 2:** FAIL → implement → PASS. Commit `llm gateway with mock + gemini`.

### Task 5: `POST /api/chat/stream` + `GET /api/conversations/:id/messages`

**Files:** Create `worker/routes/chat.ts`, `worker/routes/conversations.ts`; modify `worker/index.ts`.

**Interfaces:**

- Consumes: Tasks 2–4.
- Produces: SSE endpoint per spec §5 steps 2–5, 7, 8, 10; `GET` returns `{ messages: MessageDTO[] }` via `listMessages`.

Behavior (Hono `streamSSE`): validate with `ChatStreamRequest` (400 on fail) → `insertUserMessage` (if `inserted:false` and assistant row exists, emit `done` with it and close) → emit `start` → `recentMessages` + `systemPrompt` → `streamChat` with `c.req.raw.signal` → `delta` per chunk with incrementing `seq` → end: `saveAssistantMessage(status "complete")`, emit `done`. On abort: save accumulated text `stopped` (inside `c.executionCtx.waitUntil`, since the stream is gone). On error after first token: save `error`, emit `error {retryable:true}`. Log one line JSON: `{ provider, model, ttftMs, totalMs, chars, status }`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Verify with mock: `curl -N -X POST localhost:5173/api/chat/stream -H 'content-type: application/json' -d '{...valid ids..., "text":"hi","locale":"en"}'` → `start`, many `delta`, `done`. Re-run same body → single `done`, no new deltas. `/fail-mid` → deltas then `error`. Ctrl-C mid-stream → row status `stopped` in DB.
- [ ] **Step 3:** Switch `LLM_PROVIDERS=gemini,mock`, send Arabic text → Arabic reply; note `ttftMs` from logs.
- [ ] **Step 4:** Commit `chat stream endpoint`.

### Task 6: Client stream pipeline

**Files:** Create `src/lib/api.ts`, `src/lib/query-keys.ts`, `src/lib/ids.ts`, `src/features/chat/store.ts`, `src/features/chat/stream/frame-flush.ts`, `src/features/chat/stream/frame-flush.test.ts`, `src/features/chat/hooks/useSendMessage.ts`, `src/features/chat/hooks/useConversation.ts`.

**Interfaces:**

- Consumes: `parseEventStream`, `StreamEvent`, `MessageDTO`.
- Produces:
  - `newId(): string` (uuid v7).
  - `queryKeys.messages(conversationId)`.
  - `useChatStore` (Zustand): `streams: Record<messageId, { text: string; status: MessageDTO["status"] }>`, `append(id, text)`, `setStatus(id, status)`, `clear(id)`.
  - `createFrameFlusher(flush: (id: string, text: string) => void): { push(id, chunk): void; flushNow(): void }` — buffers, one `requestAnimationFrame` per frame.
  - `useConversation(conversationId)` → Query over `GET` messages.
  - `useSendMessage(conversationId)` → `{ send(text): void; stop(): void; isStreaming: boolean }`. `send`: ids → optimistic user (`complete`) + assistant (`streaming`) rows into Query cache → fetch with `AbortController` → deltas into flusher → `done` replaces assistant row with canonical DTO and clears store entry → `error` sets status `error`. `stop`: abort, `flushNow`, status `stopped`.

- [ ] **Step 1: Failing test** `frame-flush.test.ts`: three `push` calls before a frame → `flush` called once with concatenated text (stub `requestAnimationFrame`).
- [ ] **Step 2:** FAIL → implement all files → PASS. Commit `client stream pipeline`.

### Task 7: Chat UI

**Files:** Create `src/routes/__root.tsx`, `src/routes/index.tsx` (redirects to `/chat/$newId`), `src/routes/chat.$conversationId.tsx`, `src/features/chat/components/{MessageList,MessageRow,Markdown,Composer,StopButton}.tsx`, `src/styles/tokens.css`.

**Interfaces:**

- Consumes: Task 6 hooks/store.
- Produces: `MessageRow` memoized, reads streaming text via `useChatStore(s => s.streams[id])`; `Markdown({ text })` splits with `marked.lexer(text)` and renders each token's `raw` through a `memo`'d `react-markdown` block (key = index), so only the last block re-parses.

Design: use impeccable + better-* guidance at build time. Composer `dir="auto"`, Enter sends / Shift+Enter newline, disabled while empty. Streaming row with no text shows a typing indicator; `stopped`/`error` show a muted label and (error) a Retry button that re-sends the same text. Route pending state = message skeleton. Auto-scroll only when user is at bottom.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Verify in browser (mock): send → user bubble <100 ms; text streams; React DevTools highlight-updates shows only the streaming row re-rendering; Stop mid-stream keeps partial text; `/slow` then Stop before first token → shows "stopped", not a stuck skeleton; refresh → history reloads.
- [ ] **Step 3:** Commit `chat ui`.
