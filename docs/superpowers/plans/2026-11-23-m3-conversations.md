# M3 Conversations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A sidebar of past conversations (grouped by date, with skeletons), instant opening via hover/focus prefetch, automatic titles in the user's language, and optimistic rename and delete.

**Architecture:** The Worker gains list/rename/delete endpoints, all scoped to the user. Titles come from a short model call that runs in parallel with the first reply and arrives as a `title` SSE event. The client keeps a `conversations` list in the Query cache and updates it optimistically; TanStack Router's `preload: "intent"` (already on) prefetches a conversation's messages on hover or focus.

**Spec:** `docs/architecture.md` §4, §5 (steps 8–9), §7, §14 (M3) + `DESIGN.md` + `PRODUCT.md`.

## Plan deltas vs spec

- **Titles run during the first reply**, not as a post-response job: same cost, the title appears as the reply ends. M4 extends this into the combined title + memory + summary call.
- **Rename and delete are in M3** (spec layout lists them under the sidebar; §12 requires deletion).
- **No conversation search yet.** Add when the list is long enough to need it.

## Global constraints

- Every conversation and message query filters by `user_id = SEED_USER_ID` (passed explicitly, ready for real auth).
- List paging is keyset on `(last_message_at desc, id desc)`, 50 per page, with a "Show more" button (no infinite scroll).
- Optimistic mutations follow §7: cancel queries, snapshot, apply, roll back on error, reconcile on success.
- Delete is irreversible, so it confirms in a native `<dialog>`: title names the chat ("Delete 'Q3 report'?"), buttons are "Delete chat" / "Cancel" (better-writing).
- UI work uses `better-layout`, `better-ui`, `better-motion`, `better-accessibility`, `better-writing`; Arabic copy is natural, dialect-neutral everyday Arabic (see `src/i18n/ar.ts` header).
- Logical properties only: the sidebar sits on the inline-start edge and mirrors in RTL.
- Commits: short human messages, no AI attribution; `bun run check` passes before every commit.

## Review focus

1. A new chat appears in the sidebar the moment its first message is sent, then gains its title without a reload.
2. Deleting the open conversation navigates to a new chat; deleting another leaves the view alone.
3. Rename or delete failing on the server rolls the sidebar back and says so.
4. The title is in the language the user wrote in, plain text, ≤ 60 characters, no quotes or Markdown.
5. Mobile drawer: focus moves in on open, Escape closes it, focus returns to the menu button; RTL slides from the right.

---

### Task 1: Conversation endpoints + user scoping

**Files:** Modify `worker/db/messages.ts` (or split `worker/db/conversations.ts`), `worker/routes/conversations.ts`, `shared/events.ts`. Test: `worker/db/conversations.test.ts`.

**Interfaces:**

- `ConversationDTO` (Zod, shared): `{ id, title: string | null, lastMessageAt: string }`.
- `listConversations(db, userId, { before?: { lastMessageAt, id }, limit = 50 })` → newest first.
- `renameConversation(db, userId, id, title)`, `deleteConversation(db, userId, id)` → `{ found: boolean }`.
- `listMessages` / `recentMessages` / `getMessage` only return rows whose conversation belongs to `userId`.
- Routes: `GET /api/conversations?cursor=` (opaque base64url cursor of `lastMessageAt|id`), `PATCH /api/conversations/:id` `{ title: 1..80 }`, `DELETE /api/conversations/:id`; 404 when not found or not owned.

- [ ] **Failing DB test** (skips without `DATABASE_URL`): two conversations for the seed user and one for a second user → list returns only the seed user's two, newest first; `listMessages` for the other user's conversation as the seed user returns `[]`; delete removes the conversation and its messages.
- [ ] Implement; commit `add conversation list, rename and delete`.

### Task 2: Titles

**Files:** Create `worker/llm/prompts/title.ts`, `worker/llm/title.ts`; modify `worker/routes/chat.ts`, `worker/db/*`. Test: `worker/llm/title.test.ts`.

**Interfaces:**

- `cleanTitle(raw: string): string | null`: first line, strip quotes/backticks/Markdown markers/trailing punctuation, collapse spaces, cap 60 chars at a word boundary; empty → `null`.
- `generateTitle(providers, firstUserText, signal): Promise<string | null>` via `streamChat` collected to a string, prompt from `titlePrompt()`: 2–6 words, same language as the message, natural everyday wording, title only.
- In `chat.ts`: when the conversation has no title and this is its first user message, start `generateTitle` in parallel at turn start; after `done`, await it (bounded: 5 s) and, if non-null, save it and emit `{ type: "title", title }`. Errors are logged, never surfaced.

- [ ] **Failing test** `title.test.ts`: `cleanTitle('"React basics."')` → `React basics`; `cleanTitle("# Title\nmore")` → `Title`; a 120-char input → ≤ 60 chars ending on a whole word; `cleanTitle("   ")` → `null`; Arabic input keeps Arabic.
- [ ] Implement; verify with the mock provider (mock returns a canned title when the prompt is the title prompt); commit `generate conversation titles`.

### Task 3: Client conversation data

**Files:** Create `src/features/sidebar/hooks/{useConversations,useRenameConversation,useDeleteConversation}.ts`; modify `src/lib/{api,query-keys}.ts`, `src/features/chat/hooks/useSendMessage.ts`.

- [ ] `useConversations()`: `useInfiniteQuery` over the cursor API.
- [ ] First send in a conversation not in the list → prepend `{ id, title: null, lastMessageAt: now }` optimistically; every `done` bumps that conversation to the top; a `title` event sets its title in the cache.
- [ ] Rename/delete mutations per the §7 pattern, with rollback and an error message key (`error.rename`, `error.delete`).

### Task 4: Sidebar UI

**Files:** Create `src/features/sidebar/components/{Sidebar,ConversationItem,SidebarSkeleton}.tsx`; modify `src/routes/__root.tsx`, i18n dictionaries.

- [ ] Desktop (≥ 64rem): persistent inline-start rail (~16rem), collapsible from the header; state remembered in `localStorage`. Mobile: native `<dialog>` drawer from the inline-start edge, opened by a header menu button.
- [ ] Groups: Today / Yesterday / Previous 7 days / Older, labels via dictionaries; dates via `Intl` with the UI locale.
- [ ] Item: title (or "New chat" while untitled), active state for the open conversation, `Link` with `preload="intent"`; long titles truncate with the full title in `title`.
- [ ] Empty state: one quiet line ("No chats yet") — the composer is the action.
- [ ] Skeleton while the first page loads; "Show more" when another page exists.
- [ ] Motion: drawer slide + fade, reduced-motion → fade only (better-motion).

### Task 5: Rename and delete UI

**Files:** Modify `ConversationItem.tsx`; create `src/features/sidebar/components/DeleteDialog.tsx`.

- [ ] Item actions behind one "More" button (menu with Rename / Delete), keyboard reachable.
- [ ] Rename: inline input, Enter saves, Escape cancels, blur saves; empty → revert.
- [ ] Delete: native `<dialog>` confirm; deleting the open chat navigates to `/`.

### Task 6: Review and ship

- [ ] Browser matrix (both languages × both themes × desktop + 375px) for sidebar, drawer, rename, delete, titles.
- [ ] `better-interface` review; apply material fixes in one batch; push.
