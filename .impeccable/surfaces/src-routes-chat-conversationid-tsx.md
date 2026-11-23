---

version: 1
slug: "src-routes-chat-conversationid-tsx"
primary_target: "src/routes/chat.$conversationId.tsx"
related_targets: ["src/features/chat/components"]
---

## Scope

Chat screen (`src/routes/chat.$conversationId.tsx` and `src/features/chat/components/*`). Mode: Operate. Owner chats daily on desktop and phone; reviewers judge craft.

## Direction contract

THESIS: The category-standard AI chat (centred reading column, composer at the bottom, assistant as un-bubbled prose, user as a quiet bubble) executed at Claude.ai's typographic calm and Linear's dark precision. It refuses quirk, chrome, and decoration; craft lives in type, spacing, states, and speed.

OWN-WORLD: Dark-first neutral graphite (cool, low chroma) with one restrained blue accent used only on actionable things and focus. Hairline borders, 12px radius on the composer, 18px on the user bubble, no shadows except the composer's soft lift. Inter for Latin, Vazirmatn for Arabic, JetBrains Mono for code only. Themed selection, caret, scrollbars, focus rings.

STORY: The user types in either language, sees their message instantly, watches the reply stream smoothly, can stop or retry at any moment, and never sees a stuck or ambiguous state.

FIRST VIEWPORT: Empty chat: a single short heading and the composer centred vertically in the column. With messages: thin top bar (wordmark start, New chat end), messages in a ~68ch column, composer pinned to the bottom with Send that turns into Stop while streaming.

FORM: Category standard (canon), chosen by the user; quality bar Claude.ai + Linear. Seed key c8df19c6.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

Language switch, theme toggle, sidebar, and PWA land in later milestones; tokens must already support light theme and RTL.
