# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (installable PWA)

## Users

- **Primary:** the owner, a fullstack engineer, using Hiwar daily on desktop and phone as a personal AI assistant in Arabic, English, or both mixed in one sentence.
- **Secondary:** people evaluating the owner's work (a public portfolio piece). They judge craft: speed, polish, bilingual correctness, code quality.

## Product Purpose

A personal AI chat that remembers the user across conversations, can search the web, and explains visually (diagrams, charts, step-throughs) only when that beats text. Success: it feels instant, Arabic is as first-class as English, and it runs at near-zero cost on free model tiers.

## Positioning

Truly bilingual by construction, not translated: per-paragraph text direction, RTL/LTR layout, Arabic typography, mixed-language sentences rendered correctly. Speed is a feature: fast small models over the smartest ones, optimistic UI, streaming without jank.

## Operating Context

- Desktop and phone used equally; installable as a PWA.
- Long, mixed-language technical conversations with code blocks, Markdown, citations, and inline visuals.
- Free LLM tiers fail and rate-limit unpredictably: stopped, error, and retry states are routine, not edge cases.

## Capabilities and Constraints

- Streaming replies, Stop, retry, persisted history; memory, web search, and visuals arrive in later milestones.
- UI language follows the browser by default, with a manual AR/EN switch.
- Theme: dark (default) and light, user-switchable.
- Single user; no login in v1.
- Hosted on Cloudflare Workers free plan.

## Brand Commitments

- Name: **Hiwar** (حوار, "dialogue").
- Voice: calm and direct. Plain, short, quietly confident. No hype, no emoji.
- Visual direction: the category standard (AI chat), executed at full craft, no quirk. Quality bar: Claude.ai (calm reading column, typographic care) and Linear (precise dark UI, keyboard-first, crisp details).

## Evidence on Hand

None yet (no logo, screenshots, or testimonials). Do not fabricate any.

## Product Principles

1. Instant over impressive: perceived speed outranks visual flourish.
2. Arabic is never second: every surface is designed and checked in RTL with real Arabic.
3. Text by default, visuals when they earn it.
4. Failure is normal: every state (streaming, stopped, error, offline) is designed.

## Accessibility & Inclusion

WCAG 2.2 AA. Keyboard-complete chat (send, stop, retry). Respect reduced motion. Readable Arabic sizes and line height.
