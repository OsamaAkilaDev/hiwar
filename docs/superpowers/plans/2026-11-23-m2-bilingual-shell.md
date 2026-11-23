# M2 Bilingual Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Hiwar's interface works fully in Arabic (RTL) and English (LTR) with a manual switch, dark/light themes with dark default, installs as a PWA, and stays under the free-plan CPU budget.

**Architecture:** Locale and theme live on `<html>` (`lang`, `dir`, `data-theme`), set by a tiny inline script before first paint (no flash) and changed at runtime by a small preferences store. UI strings come from two typed dictionaries. The PWA is a manifest plus a precaching service worker that never touches `/api/*`.

**Spec:** `docs/architecture.md` §10, §14 (M2) + `PRODUCT.md` + `DESIGN.md`.

## Plan deltas vs spec

- **No react-i18next.** About 20 strings; two typed dictionaries plus native `Intl.PluralRules` (which knows Arabic's six plural forms) cover it with zero dependencies. Revisit if strings pass ~150 or translators get involved.
- **CPU fix first (M1 leftover).** Production measured 22–103 ms CPU against the free plan's 10 ms.

## Global constraints

- Locale resolution: saved choice → `navigator.languages` (any `ar*` → `ar`) → `en`. Theme: saved choice → `dark`.
- Persist both in `localStorage` (`hiwar.locale`, `hiwar.theme`), read in a try/catch.
- `<html lang dir data-theme>` set before first paint; `<meta name="theme-color">` follows the theme.
- Directional icons mirror in RTL (`rtl:-scale-x-100`); symmetric icons don't.
- Every user-facing string goes through `t()`. Message bodies keep per-block `dirOf` (unchanged).
- Numbers and dates via `Intl` with the active locale, Western digits (decision: readable in technical chats; revisit with the user).
- Commits: short human messages, no AI attribution. `bun run check` must pass before every commit.
- UI work uses the `better-*` skills: `better-writing` for all copy (both languages), `better-layout` + `better-accessibility` for controls and the RTL pass, `better-interface` as the closing ranked review. Bar: pristine, clean, modern, sleek, unique.

## Review focus

1. Hard refresh in Arabic: no flash of LTR/English or light theme before JS loads.
2. Switching language mid-stream doesn't break the stream or the reply's direction.
3. Header controls, composer button, Retry icon, and skeleton all mirror correctly in RTL.
4. Service worker never caches `/api/*` and a new deploy reaches the user (update on reload).
5. Installed PWA launches into the app with the right theme color and name.

---

### Task 1: Replace the `openai` SDK with `fetch` + our SSE parser

**Why:** the SDK is the heaviest module in the Worker and parses each chunk through several layers; we already own a tested SSE parser.

**Files:** Modify `worker/llm/providers/openai-compatible.ts`, `package.json` (remove `openai`). Test: `worker/llm/providers/openai-compatible.test.ts`.

**Interfaces:** `openAICompatible(...)` keeps its exact signature and `Provider` contract.

- [ ] **Failing test** with a stubbed `fetch` returning an OpenAI-style SSE body (`data: {"choices":[{"delta":{"content":"Hi"}}]}` … `data: [DONE]`): yields `["Hi", ...]`; a non-2xx response throws an Error containing the status and the provider's error message.
- [ ] Implement with `fetch(baseURL + "chat/completions", { method: "POST", signal, body: { model, messages, stream: true } })`, read lines prefixed `data:`, stop at `[DONE]`. Do not reuse `parseEventStream` (that one validates our own events); share only the line-buffering approach.
- [ ] Deploy and compare CPU per request with `wrangler tail` against the M1 baseline (22–103 ms). Record the numbers in the commit message body.

### Task 2: Preferences: locale + theme

**Files:** Create `src/lib/prefs.ts`, `src/i18n/{en.ts,ar.ts,index.ts}`; modify `index.html` (inline boot script), `src/main.tsx`.

**Interfaces:**

- `usePrefs` (Zustand): `{ locale: "ar" | "en"; theme: "dark" | "light"; setLocale(l); setTheme(t) }`. Setters write `localStorage` and update `<html>` attributes + theme-color meta.
- `useT(): (key: MessageKey, vars?: Record<string, string | number>) => string`, where `MessageKey = keyof typeof en`. `ar` is typed `Record<MessageKey, string>` so a missing Arabic key fails typecheck.
- `formatNumber(n)`, `plural(n, forms)` via `Intl`.

- [ ] **Failing test** `src/lib/prefs.test.ts`: `resolveLocale({ saved: null, languages: ["ar-AE", "en"] }) === "ar"`; `resolveLocale({ saved: "en", languages: ["ar"] }) === "en"`; `resolveLocale({ saved: null, languages: ["fr"] }) === "en"`.
- [ ] Inline boot script in `index.html` applies the same rules synchronously (kept tiny; mirrors `resolveLocale`).
- [ ] Move every existing UI string (composer placeholder, Send/Stop labels, empty heading, Stopped / No response / error copy, Retry, New chat, Thinking) into the dictionaries. Arabic copy is calm and direct, written natively, not translated word for word.

### Task 3: Header controls + RTL pass

**Files:** Modify `src/routes/__root.tsx`, components that hold icons.

- [ ] Header end side: language switch (shows the _other_ language's name, e.g. "العربية" / "English", `lang` attribute set on the label) and theme toggle (Sun/Moon icon, `aria-pressed`), both keyboard reachable with visible focus.
- [ ] Mirror only directional icons; verify the composer's ArrowUp and SquarePen stay unmirrored.
- [ ] Browser check, both themes × both languages, desktop and 375px: header, empty state, a mixed conversation, error and stopped rows. Fix what breaks.

### Task 4: PWA

**Files:** Add `vite-plugin-pwa`; create `public/icons/*`, `public/favicon.svg`; modify `vite.config.ts`, `index.html`.

- [ ] App icon: a simple SVG mark (the letter ح on the graphite ground, accent-colored), exported to 192/512 PNG and a maskable 512.
- [ ] Manifest: `name: "Hiwar"`, `short_name: "Hiwar"`, `display: "standalone"`, `background_color`/`theme_color` from the dark tokens, `dir: "auto"`, `lang: "en"`.
- [ ] Service worker via `generateSW`: precache built assets, `navigateFallback: "/index.html"`, `navigateFallbackDenylist: [/^\/api\//]`, no runtime caching of `/api/*`, `registerType: "autoUpdate"`.
- [ ] Verify: Lighthouse/Chrome "installable", offline reload shows the shell, a new deploy is picked up on next load.

### Task 5: Interface review

- [ ] Run `better-interface` over the whole app (both languages, both themes, desktop + 375px) and apply its material fixes in one batch.
