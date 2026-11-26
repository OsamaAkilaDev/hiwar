---
name: Hiwar
description: A bilingual (Arabic/English) personal AI chat on cool graphite, with a dot-matrix haa mark and a switchable accent.
colors:
  bg: "#17171a"
  rail: "#1b1b1e"
  surface: "#212124"
  surface-2: "#2b2b2e"
  line: "#353538"
  fg: "#eeeef1"
  muted: "#b7b7bb"
  subtle: "#9e9ea2"
  danger: "oklch(0.72 0.14 25)"
  accent-teal: "#5addc7"
  accent-teal-ink: "#00201b"
  accent-saffron: "#fac053"
  accent-blue: "#9dc7fe"
  accent-violet: "#c8b7ff"
  accent-rose: "#ffa5c8"
  accent-lime: "#a2df80"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Noto Kufi Arabic, Vazirmatn Variable, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    letterSpacing: "-0.02em"
  display-arabic:
    fontFamily: "Noto Kufi Arabic, Vazirmatn Variable, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.85
    letterSpacing: "0"
  title:
    fontFamily: "Onest Variable, Vazirmatn Variable, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Onest Variable, Vazirmatn Variable, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.7
  body-arabic:
    fontFamily: "Vazirmatn Variable, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Onest Variable, Vazirmatn Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  code:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  code-inline: "0.3rem"
  lg: "0.5rem"
  icon-button: "0.65rem"
  xl: "0.75rem"
  card: "0.9rem"
  bubble: "1.125rem"
  composer: "1.25rem"
  full: "9999px"
spacing:
  message-gap: "2rem"
  column: "52rem"
  column-inline: "1.5rem"
  header: "3.5rem"
  sidebar: "17rem"
  icon-button: "2.125rem"
  send: "2.25rem"
components:
  button-send:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.accent-teal-ink}"
rounded: "{rounded.xl}"
  size: "2.25rem"
  button-send-disabled:
  backgroundColor: "{colors.surface-2}"
  textColor: "{colors.subtle}"
  button-icon:
  textColor: "{colors.muted}"
rounded: "{rounded.icon-button}"
  size: "2.125rem"
  button-icon-hover:
  backgroundColor: "{colors.surface-2}"
  textColor: "{colors.fg}"
  composer:
rounded: "{rounded.composer}"
  message-user:
  backgroundColor: "{colors.surface-2}"
  textColor: "{colors.fg}"
rounded: "{rounded.bubble}"
  padding: "0.625rem 1rem"
  card:
  backgroundColor: "{colors.surface}"
rounded: "{rounded.card}"
  padding: "1rem 1.1rem"
  sidebar-row:
  textColor: "{colors.fg}"
rounded: "{rounded.lg}"
  height: "34px"
  padding: "0 0.75rem"
---

# Design System: Hiwar

## Overview

**Creative North Star: "The Quiet Reading Room"**

A single centred reading column on cool graphite. The assistant speaks as bare prose, the user sits in a bubble, the composer floats at the foot. One accent marks what you can act on, and the user picks it from six. Dark is the default; light shares every token name.

It is bilingual by construction. Each Markdown block sets its own direction from its majority script; Arabic gets Noto Kufi Arabic for display and Vazirmatn for text with taller leading; layout uses logical properties; code and math stay left-to-right and isolated.

**Key Characteristics:**

- Neutrals carry a faint cool tint; one accent at a time, teal by default.
- Assistant replies are unboxed prose; visuals (diagrams, charts, blocks) sit in cards that match code blocks.
- Glass (blurred translucent bg) on the header and composer; the sidebar is a solid rail.
- Springy entrances for the user bubble and shell; everything else is a short ease-out.
- The Mark, a dot-matrix haa, is the brand and the empty-state hero.

## Colors

Cool graphite neutrals plus one accent per theme. Accents were measured: at least 9.7:1 on the dark page, and white ink at least 4.7:1 on the light accents.

### Primary

- **Accent** (`--accent`, default teal `#5addc7` dark, `#037465` light): Send fill, links, caret, selection (35% mix), focus rings, lit dots of the Mark, citation numbers, timeline dots, chart and diagram strokes. `--accent-ink` is the glyph colour on it (`#00201b` teal dark, white on every light accent). `--accent-soft` is the accent mixed into transparent (16% dark, 12% light) for focus halos, hovers, and tinted fills.
- Other accents, dark / light: saffron `#fac053` / `#825b00`, blue `#9dc7fe` / `#2863ab`, violet `#c8b7ff` / `#6a51a4`, rose `#ffa5c8` / `#9a3e67`, lime `#a2df80` / `#40731a`. Full ink values are in the sidecar and `src/styles/app.css`.

### Neutral

- **bg** (`#17171a` / light `#fbfbfc`): page.
- **rail** (`#1b1b1e` / `#f3f3f5`): sidebar and drawer.
- **surface** (`#212124` / `#ffffff`): cards, code blocks, diagram stage.
- **surface-2** (`#2b2b2e` / `#ededf0`): user bubble, inline code, hover fills, chips.
- **line** (`#353538` / `#e2e2e7`): all 1px borders and rails.
- **fg** (`#eeeef1` / `#17171b`), **muted** (`#b7b7bb` / `#55555f`), **subtle** (`#9e9ea2` / `#6b6b76`): text steps.
- **glass** (`rgb(27 27 30 / 0.62)` / `rgb(251 251 252 / 0.7)`): header and composer fill.

### Tertiary

- **danger** (`oklch(0.72 0.14 25)` / `oklch(0.55 0.18 25)`): errors, the "cons" side of Pros/Cons, critical Gantt tasks.

### Named Rules

**The Switchable Accent Rule.** Never hard-code a hue. Everything chromatic reads `--accent`, `--accent-ink`, `--accent-soft`, or `--accent-text`, so all six accents and both themes work.

**The Token-Themed Visuals Rule.** Mermaid, Graphviz, Markmap, Chart and Plot read the same tokens at render time (`tokenColor`), so a theme or accent switch redraws them. Accent tints are `color-mix(in oklab, var(--accent) N%, var(--surface))`.

## Typography

**Display Font:** Bricolage Grotesque Variable (then Noto Kufi Arabic, Vazirmatn Variable)
**Body Font:** Onest Variable (then Vazirmatn Variable, system-ui)
**Arabic Display:** Noto Kufi Arabic (500, 700)
**Mono Font:** JetBrains Mono Variable

**Character:** A rounded, characterful grotesque for the wordmark and headlines, a plain sans for reading. The root is 112%, so every rem is 12% larger than default.

### Hierarchy

- **Display** (500, 1.875rem, 2.25rem from `sm`, tracking -0.02em): empty-state greeting; Arabic switches to Kufi with tracking 0.
- **Wordmark** (700, 1.2rem Bricolage, tracking -0.03em; Kufi 1.15rem in Arabic): sidebar header beside the Mark.
- **Title** (600, 1.3rem / 1.15rem / 1rem, 1.35): Markdown h1/h2/h3, balanced; block titles in Compare cards use display 500 at 0.95rem.
- **Body** (400, 0.95rem, 1.7, max 75ch): replies and user bubble; Arabic 1.85.
- **Label** (500, 0.875rem): header title; sidebar rows 0.9rem; status text 0.75-0.875rem.
- **Code** (400, 0.8rem block, 0.86em inline, 1.65): code blocks, inline code, citation chips (0.65rem), dates in timelines.

### Named Rules

**The Script Decides Rule.** Direction is set per block by majority script; Arabic text carries `lang="ar"` and line-height 1.85.

**The Code Is LTR Rule.** Code and KaTeX are `direction: ltr; unicode-bidi: isolate`; code blocks are left-aligned.

## Layout

Sidebar rail (17rem) at `lg` and above, a drawer (`min(20rem, 85vw)`) below; the shell slides in from the inline start. The chat column is `max-w 52rem` with 1.5rem inline padding (plus safe-area insets), turns separated by 2rem. The sticky header is 3.5rem plus the top safe area, with a sidebar toggle, the chat title (truncated, `dir="auto"`), and a New chat button; the toggle and New chat hide on `lg` when the sidebar is open. The composer docks to the foot with a keyboard-hint line (hidden on coarse pointers). Logical properties throughout; directional icons flip with `rtl:-scale-x-100`. Scroll padding keeps focused targets clear of the header (3.5rem) and composer (9rem).

## Elevation & Depth

Tonal steps (bg, rail, surface, surface-2) plus 1px `line` borders; the header and composer add backdrop blur (18px / 20px) with saturate 150%. An ambient aurora (accent glow, 26rem tall) sits behind the column and a fixed film grain (10% overlay) covers the page; both hide under reduced transparency, and grain hides in forced colors.

### Shadow Vocabulary

- **Lift** (`--lift`: `0 18px 50px -24px rgb(0 0 0 / 0.55)` dark, `0 18px 50px -28px rgb(15 20 30 / 0.25)` light): composer and the fullscreen diagram toolbar.
- **Focus halo** (`0 0 0 4px var(--accent-soft)` plus lift): composer on focus-within, with its border moving to 55% accent over line.

## Shapes

Radii step with object size: 0.3rem inline code and keycaps, 0.5rem rows and small buttons, 0.65rem header/sidebar icon buttons, 0.75rem send button, compare cards and toolbars, 0.9rem code blocks and visual cards, 1.125rem user bubble with a 0.375rem tail corner at the bottom inline end, 1.25rem composer, 1rem fullscreen modal, full for chips, dots, and the model-status pill. Borders are 1px `line`.

## Components

### Buttons

- **Send:** 2.25rem, accent fill, `accent-ink` bold arrow; disabled falls to surface-2 / subtle and scales to 0.86. Uses `.spring` (scale on `--spring`, 450ms). Becomes Stop (filled square) while streaming.
- **Icon button:** 2.125rem, muted, hover surface-2 and fg. Reply actions (copy, retry) are 1.75rem, revealed on hover or focus, always shown on coarse pointers.
- **Press:** every enabled button scales to 0.96 on `:active`.
- **Focus:** global 2px accent outline, 2px offset.

### Composer

Glass fill, 1px line, 1.25rem radius, lift. Textarea 0.95rem, min 3.5rem, max 14rem, transparent. Footer holds the model picker (a native select styled as a ghost control, 2rem tall, chevron at the end) and Send/Stop. Kbd hints are 0.7rem mono with a line border.

### Messages

- **User:** surface-2 bubble, max 85%, 0.625rem by 1rem padding, at the inline end; new ones enter with `.bubble-in` (550ms `--spring`, scale from 0.6, origin bottom at the sending side).
- **Assistant:** a 1.75rem Mark avatar column plus bare prose; new rows rise in (`rise` 450ms). A blinking block caret (accent) trails a streaming reply; loading shows rotating words with a typing caret.
- **Search status:** surface-2 pill with a pulsing accent icon; sources are surface-2 chips with a numbered mono badge, hover accent-soft. Inline citations are 1.15rem mono chips in accent text.

### Sidebar

Rail background, 3.5rem header with the Mark (1.75rem) and wordmark, then New chat and a search row (surface fill, line border, accent border on focus-within). Rows are 34px, 0.5rem radius, 0.9rem text. Groups have 0.75rem subtle labels. A footer row with an accent-filled initial opens settings.

### Mark and logo

A 5 by 7 dot grid forming the haa: 14 lit dots (r 14.3 in `--accent`) and ghost dots (r 5.1, currentColor at 18%). `animate="draw"` pops lit dots in pen order (45ms stagger); `"think"` pulses them (1.2s, 70ms stagger). Assets in `brand/`: `mark.svg` (teal `#7cd0c2` fixed), `mark-mono.svg`, `mark-white.svg`, `app-icon.svg`, lockups (dark, light, stacked dark).

### Code and visual cards

Code blocks and `.visual` cards share one shell: surface fill, 1px line, 0.9rem radius, 1rem padding. Blocks (staggered `block-in`, 70ms per item):

- **Timeline:** hairline rail, 0.875rem ring dots in accent, mono accent date.
- **Compare:** auto-fit grid (min 12rem) of 0.75rem cards on `bg/40`, accent bullets.
- **Pros/Cons:** same cards; accent check / danger cross chips.
- **Cycle:** circular layout, accent numbered nodes joined by subtle arrows.
- **Tree:** 1px line branches with 1rem connectors.
- **Chart / Plot:** accent series; secondary series use fg, muted, and dashes; grid in line, axes in subtle; bars grow, lines wipe (RTL-aware).
- **Diagram (Mermaid, Graphviz, Markmap):** flat nodes with 8px corners and no filters; inline max height 28rem. Toolbar: source toggle, copy, download, fullscreen. Fullscreen is a modal (`calc(100dvh - 2rem)`, 1rem radius) with a glass toolbar (zoom, fit, close) and a draggable stage.

### Motion

Easing `cubic-bezier(0.2, 0, 0, 1)`: `.enter` and `.page-in` 300ms with 4px blur and 12px rise, `.shell-in` 450ms, drawer 200/350ms, modal 150/200ms. `--spring` (a 22-point `linear()` curve, about 9% overshoot) drives `.bubble-in` and `.spring`. Under reduced motion, entrances keep only a 150ms fade and other animations collapse to 0.01ms.

## Do's and Don'ts

### Do:

- **Do** read colour from tokens, including in SVG, canvas-like renderers, and diagram themes.
- **Do** keep text 4.5:1 or better; new accents need measured ink pairs for both themes.
- **Do** set direction per block, add `lang="ar"`, and use logical properties.
- **Do** build new cards on the shared shell (surface, line, 0.9rem) and stagger with `--i`.
- **Do** give every entrance a reduced-motion fallback.

### Don't:

- **Don't** box assistant replies; only the user's turn gets a bubble.
- **Don't** hard-code a hue or use the accent as a fill for large areas.
- **Don't** use `--lift` on messages, code, or cards.
- **Don't** use JetBrains Mono for anything but code, dates, citation and step numbers.
- **Don't** let code or math inherit RTL.
