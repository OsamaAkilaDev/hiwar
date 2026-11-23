---

name: Hiwar
description: A bilingual (Arabic/English) personal AI chat, calm reading column on dark graphite.
colors:
bg: "oklch(0.165 0.004 265)"
surface: "oklch(0.205 0.005 265)"
surface-2: "oklch(0.245 0.006 265)"
border: "oklch(0.29 0.006 265)"
fg: "oklch(0.93 0.004 265)"
fg-muted: "oklch(0.7 0.008 265)"
fg-subtle: "oklch(0.63 0.008 265)"
accent: "oklch(0.72 0.12 255)"
accent-fg: "oklch(0.17 0.02 255)"
danger: "oklch(0.72 0.14 25)"
typography:
headline:
fontFamily: "Inter Variable, Vazirmatn Variable, system-ui, sans-serif"
fontSize: "1.5rem"
fontWeight: 500
letterSpacing: "-0.025em"
title:
fontFamily: "Inter Variable, Vazirmatn Variable, system-ui, sans-serif"
fontSize: "1.3rem"
fontWeight: 600
lineHeight: 1.35
body:
fontFamily: "Inter Variable, Vazirmatn Variable, system-ui, sans-serif"
fontSize: "1rem"
fontWeight: 400
lineHeight: 1.7
fontFeature: "\"cv11\", \"ss01\""
body-arabic:
fontFamily: "Vazirmatn Variable, system-ui, sans-serif"
fontSize: "1rem"
fontWeight: 400
lineHeight: 1.85
label:
fontFamily: "Inter Variable, Vazirmatn Variable, system-ui, sans-serif"
fontSize: "0.875rem"
fontWeight: 400
lineHeight: 1.43
code:
fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
fontSize: "0.84rem"
fontWeight: 400
lineHeight: 1.6
rounded:
code-inline: "0.3rem"
md: "6px"
lg: "8px"
code-block: "0.6rem"
xl: "12px"
bubble: "18px"
full: "9999px"
spacing:
xs: "8px"
sm: "16px"
message-gap: "28px"
column: "38rem"
header: "56px"
icon-button: "36px"
components:
button-send:
backgroundColor: "{colors.accent}"
textColor: "{colors.accent-fg}"
rounded: "{rounded.lg}"
size: "36px"
button-send-disabled:
backgroundColor: "{colors.surface-2}"
textColor: "{colors.fg-subtle}"
button-stop:
backgroundColor: "{colors.fg}"
textColor: "{colors.bg}"
rounded: "{rounded.lg}"
size: "36px"
button-icon-ghost:
textColor: "{colors.fg-muted}"
rounded: "{rounded.lg}"
size: "36px"
button-icon-ghost-hover:
backgroundColor: "{colors.surface-2}"
textColor: "{colors.fg}"
button-retry:
textColor: "{colors.accent}"
rounded: "{rounded.md}"
padding: "4px 8px"
composer:
backgroundColor: "{colors.surface}"
rounded: "{rounded.xl}"
padding: "8px"
message-user:
backgroundColor: "{colors.surface-2}"
textColor: "{colors.fg}"
rounded: "{rounded.bubble}"
padding: "10px 16px"
code-block:
backgroundColor: "{colors.surface}"
typography: "{typography.code}"
rounded: "{rounded.code-block}"
padding: "0.9rem 1rem"
---

# Design System: Hiwar

## Overview

**Creative North Star: "The Quiet Reading Room"**

Hiwar is the category-standard AI chat executed at full craft: a single centred reading column, the assistant speaking as un-bubbled prose, the user as a quiet bubble, the composer at the foot of the page. Craft lives in type, spacing, states, and speed, never in chrome or decoration. The world is dark-first cool graphite with one restrained blue that marks only what can be acted on.

It is bilingual by construction, not by translation. Every message and every Markdown block sets its own direction from its majority script; Arabic blocks carry `lang="ar"` and get Vazirmatn with taller leading; layout uses logical properties only; code is always left-to-right and isolated. Light theme shares every token name and is a first-class peer, not an inversion afterthought.

**Key Characteristics:**

- One centred column (38rem) for messages and composer alike.
- Assistant replies are bare prose; only the user's turn sits in a surface.
- Depth from tonal steps of graphite plus hairline borders; one soft shadow, under the composer.
- Accent blue appears on Send, Retry, links, caret, selection, and focus rings, and nowhere else.
- Per-block text direction; Arabic and English are equal citizens.

## Colors

A near-achromatic cool graphite ramp (hue 265, chroma under 0.01) carrying a single mid-blue accent and a warm red for failure only.

### Primary

- **Signal Blue** (accent): the only chromatic voice. Send button fill, Retry text, prose links, text caret, selection tint (accent at 32% in dark, 20% in light), and every focus ring.
- **Ink on Signal** (accent-fg): glyph color on the accent fill.

### Neutral

- **Graphite Night** (bg): page background, sticky header and composer dock, so they read as part of the page rather than bars.
- **Graphite Raised** (surface): composer body, code blocks, skeleton prose lines.
- **Graphite Lifted** (surface-2): the user bubble, inline code, ghost-button hover, disabled Send, skeleton bubble.
- **Hairline** (border): composer and code-block outlines, table rules, blockquote rule, scrollbar thumb.
- **Paper White** (fg): body text; also the Stop button fill.
- **Muted Ash** (fg-muted): header icon at rest, blockquote text, thinking dots.
- **Quiet Ash** (fg-subtle): placeholders, list markers, status notes, composer focus border.

### Tertiary

- **Ember** (danger): error notes only. Never a fill.

Light theme values for every token are defined in `src/styles/app.css` under `[data-theme="light"]` and mirrored in the sidecar.

### Named Rules

**The Actionable Blue Rule.** The accent marks only things you can act on or the place you are acting (focus, caret, selection). Headings, icons at rest, decoration, and status never take it.

**The Inverted Stop Rule.** While a reply streams, Send becomes Stop, filled with fg on bg text, not accent. Halting is a neutral, high-contrast act, distinct from sending.

## Typography

**Body Font:** Inter Variable (with Vazirmatn Variable for Arabic glyphs, then system-ui)
**Arabic Font:** Vazirmatn Variable, reached through the same stack
**Mono Font:** JetBrains Mono Variable (code only)

**Character:** One neutral, precise sans for both scripts, with Inter's `cv11` and `ss01` alternates on; mono is a tool for code and never used as a typographic accent.

### Hierarchy

- **Headline** (500, 1.5rem, tight tracking): the single empty-state prompt, centred above the composer.
- **Title** (600, 1.3rem / 1.15rem / 1rem, 1.35): Markdown h1/h2/h3 inside replies, balanced wrapping.
- **Body** (400, 1rem, 1.7): assistant prose; user bubble uses 1.625. Arabic blocks rise to 1.85.
- **Label** (400, 0.875rem): status notes (Stopped, No response, errors) and Retry.
- **Code** (400, 0.84rem block / 0.86em inline, 1.6): code blocks and inline code; tables use tabular numerals at 0.9rem.
- **Wordmark**: "Hiwar" in Inter 600 at body size with tight tracking; no logo asset exists.

### Named Rules

**The Script Decides Rule.** Direction is set per block by majority script (Arabic letters versus Latin letters), so an Arabic paragraph that opens with an English term still reads right-to-left. RTL blocks always carry `lang="ar"`.

**The Code Is LTR Rule.** Inline and block code are `direction: ltr` and `unicode-bidi: isolate` in every context; code blocks also force left alignment.

## Layout

A single centred column, `max-width: 38rem` with 16px inline padding, holds the message list, the composer, and the loading skeleton, so nothing shifts between states. The header is a 56px sticky bar on the page background: wordmark at the start, New chat icon at the end. With no messages the headline and composer sit vertically centred, nudged up by 12vh of bottom padding. With messages, turns stack with a 28px gap, the composer docks sticky at the bottom on the page background with 16px below it, and the stream auto-follows only while the reader is within 120px of the end. Everything flips through logical properties (`ms-auto`, `padding-inline-start`, `border-inline-start`, `text-align: start`); the user bubble sits at the inline end in both directions and caps at 85% of the column.

## Elevation & Depth

Flat by default. Depth comes from three tonal steps of graphite (bg, surface, surface-2) and 1px hairline borders. The composer is the one lifted object.

### Shadow Vocabulary

- **Composer lift** (`box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.5)`): under the composer only, so the input floats slightly over scrolling text.

### Named Rules

**The One Lift Rule.** Only the composer casts a shadow. Messages, code blocks, and buttons stay flat.

## Shapes

Soft, small-to-medium radii scaled to object size: 0.3rem inline code, 6px text buttons, 8px icon buttons, 0.6rem code blocks, 12px composer, 18px user bubble, full circles for the thinking dots. Borders are always 1px hairlines; no border ever carries color except the composer's focus shift to fg-subtle.

## Components

### Buttons

Square, quiet, icon-first, 36px.

- **Shape:** gently rounded (8px) for icon buttons, 6px for the Retry text button.
- **Send:** accent fill, accent-fg arrow glyph; disabled when empty or streaming, falling back to surface-2 with fg-subtle glyph. Hover drops opacity to 90%.
- **Stop:** replaces Send during streaming; fg fill with bg glyph, hover to 85% opacity. Escape also stops.
- **Ghost icon (New chat):** fg-muted glyph, no fill; hover fills surface-2 and brightens to fg.
- **Retry:** accent text with a counter-clockwise icon mirrored in RTL; hover fills surface-2.
- **Focus:** global 2px accent outline, 2px offset, on every focusable element.

### Inputs / Fields

- **Composer:** surface fill, 1px hairline border, 12px radius, 8px padding, composer lift shadow. The textarea is transparent, auto-grows from 40px to 208px, and uses `dir="auto"`.
- **Focus:** the textarea has no outline of its own; the whole composer border shifts to fg-subtle on `focus-within`.
- **Keys:** Enter sends (respecting IME composition), Shift+Enter breaks the line.

### Navigation

- **Header:** 56px, sticky, page-background fill, no border. Wordmark at the start, one ghost icon button at the end.

### Messages

- **User:** surface-2 bubble, 18px radius, 10px by 16px padding, preserves whitespace, aligned to the inline end.
- **Assistant:** no container. Markdown prose split into top-level blocks, each with its own direction; blocks space at 0.9em, headings at 1.4em above.
- **Thinking:** three 6px fg-muted dots pulsing in sequence (1.2s, 0.16s stagger) before the first token.
- **Status notes:** 0.875rem fg-subtle line (Stopped, No response) or danger line (errors), with an inline Retry where retry is possible.
- **Skeleton:** a surface-2 bubble shape and three surface prose bars pulsing in the same column.

### Code

- **Block:** surface fill, hairline border, 0.6rem radius, JetBrains Mono 0.84rem / 1.6, horizontal scroll, LTR isolated.
- **Inline:** surface-2 fill, 0.3rem radius, 0.86em mono, LTR isolated.

## Do's and Don'ts

### Do:

- **Do** keep every surface inside the single 38rem column with 16px inline padding.
- **Do** set direction per block from majority script and add `lang="ar"` to RTL blocks.
- **Do** use logical properties only (start/end, inline/block) and mirror directional icons in RTL.
- **Do** reserve the accent for actionable elements, links, caret, selection, and focus rings.
- **Do** design stopped, empty, and error states as plain status lines with an inline Retry.
- **Do** honor reduced motion; all animation and transition durations collapse to near zero.

### Don't:

- **Don't** put assistant replies in bubbles or cards; only the user's turn gets a surface.
- **Don't** add shadows beyond the composer lift.
- **Don't** use JetBrains Mono outside code.
- **Don't** use the accent for headings, decoration, or status; failure uses danger, neutral status uses fg-subtle.
- **Don't** let code inherit RTL from its surrounding block.
