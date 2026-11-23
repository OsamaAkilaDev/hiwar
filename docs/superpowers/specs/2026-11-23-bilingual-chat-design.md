# Bilingual AI Chat — Design (deltas on `docs/architecture.md`)

`docs/architecture.md` is the source of truth. This file records only the decisions made on top of it.

## Intent

Single user (me), built product-grade as a portfolio piece. Functional product first; demo mode, landing page, and showcase extras come later.

## Decisions

| Area                    | Decision                                                                                                                                                       | Why                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Auth                    | No login in v1. `users` table + `user_id` on every row, one seeded user.                                                                                       | Per-user isolation stays in the schema; login drops in later without migration.                 |
| Hosting                 | One Cloudflare Worker serves the SPA (static assets) and the Hono API under `/api/*`.                                                                          | Same origin: no CORS, one deploy. Free plan.                                                    |
| Postgres                | Neon free tier (pgvector included), reached from the Worker through Hyperdrive.                                                                                | One store for rows + vectors, so deletes stay transactional. Hyperdrive free: 100k queries/day. |
| Embeddings              | Workers AI `@cf/baai/bge-m3`.                                                                                                                                  | Multilingual (AR/EN cross-retrieval), free, same platform.                                      |
| Shared state            | KV for provider cooldowns; no in-process caches (isolates are ephemeral).                                                                                      | Isolate memory doesn't survive between requests.                                                |
| Background jobs         | `ctx.waitUntil` (≤30 s after response).                                                                                                                        | Enough for one combined title/memory/summary call; no Queues.                                   |
| Stop                    | `request.signal` (compat date ≥ 2026-11-17), passed explicitly into provider `fetch`.                                                                          | Disconnect cancels upstream work and triggers the `stopped` save.                               |
| DB access               | Drizzle ORM + `postgres` driver, SQL migrations via drizzle-kit.                                                                                               | Typed queries, schema in TS shared with Zod, no heavy runtime.                                  |
| Repo shape              | Single Vite package (`src/` SPA, `worker/` API, `shared/` contracts); Bun for installs, scripts, tests. Cloudflare Workers Builds (Git integration) for CI/CD. | One Worker = one app; workspaces add nothing.                                                   |
| LLM client              | `openai` npm SDK pointed at each provider's OpenAI-compatible base URL.                                                                                        | One client handles streaming + tool-call parsing for every provider.                            |
| M1 order                | Mock provider + ONE real provider first; fallback chain, cooldowns, capability table land once a free-tier limit is actually hit.                              | Same design, built when it earns its place.                                                     |
| Vector index            | No HNSW until memories reach ~10k rows.                                                                                                                        | Exact scan is faster to build and accurate at personal scale.                                   |
| Query cache persistence | Not in v1.                                                                                                                                                     | Open decision §15 — revisit after M3.                                                           |

## Known limits (measure in M1)

- Free Workers CPU: 10 ms/request (I/O wait excluded). If streaming + tool loop exceeds it → $5 Paid plan.
- Neon scales to zero after ~5 min idle: first query after idle costs ~0.5–1 s.

## Approaches considered

1. **Spec as written, in order** — fallback chain and full gateway before the first real message. Rejected: weeks of infra before anything is usable.
2. **Spec, re-ordered lean (chosen)** — same architecture, each piece added when a real need shows up.
3. **Off-the-shelf (Vercel AI SDK + assistant-ui)** — fastest to a working chat. Rejected: hides exactly the streaming/optimistic/RTL work this project exists to show.

## Left to the builder

Exact library versions, markdown renderer choice (must tolerate unclosed fences), chart implementation (decide in M6), first real provider for M1.
