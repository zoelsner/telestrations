# Telestrations — Design Spec (reference for build)

Source: Claude Design project `ff9de452-8e43-4eea-889c-13d2b2e4f9be`, file **`Telestrations Final.dc.html`**
(raw canvas saved alongside this doc as `telestrations-final.dc.html`).

> This is a **reference capture only** — nothing here is wired into the app yet.
> The raw `.dc.html` is Claude Design's canvas format (`<x-dc>`, `style-hover`,
> `./support.js`, `./uploads/*.png`); it won't render standalone in a browser, but every
> color, string, and layout detail is faithful. This spec distills it for implementation.
>
> An alternate variant `Telestrations Spiced.dc.html` also exists in the project (not pulled).

## Direction

Section title in the doc: *"light app, warm accents, half circles."* Light warm-paper
background, navy ink, terracotta primary action. The **signature motif is a half-pill /
half-circle** (`border-radius: 999px 999px 0 0`) — used for player-color avatars, brush
swatches, and decorative "bobbing" shapes in the corners.

## Design tokens

### Color
| Role | Hex |
| --- | --- |
| Canvas / page bg | `#efe8da` |
| App screen bg | `#f6f5f2` |
| Card bg (raised) | `#fffdf7` |
| Card bg (plain white) | `#ffffff` |
| Ink / primary text / dark buttons | `#1a2540` |
| Ink hover | `#111a30` |
| **Primary action (terracotta)** | `#d44e2a` |
| Primary action hover | `#bf431f` |
| Cream fill (banners, badges, turn chip) | `#fdebcc` |
| Cream border | `#e6d3a8` |
| Gold / amber accent | `#c8963e` |
| Host label text | `#8a6a2f` |
| Teal / slate accent | `#3b5a6a` |
| Green (success / "submitted") | `#5a7a3a` |; light bg `#eaf0dd`, border `#c9d6ad`
| Purple accent / decorative | `#7a5a7f` / `#e9dff0` |
| Warm border (inputs, cards) | `#d9d2c2` |
| Lighter divider | `#e4e0d8` |
| Player badge bg / border / text | `#e8ecf5` / `#c9d2e4` / `#3b5a6a` |
| Muted text (scale) | `#5d6472`, `#6b7280`, `#8a8275`, `#9aa1ad`, `#a89d84` |

**Player avatar colors** (half-pills): `#d44e2a`, `#c8963e`, `#3b5a6a`, `#7a5a7f`, `#5a7a3a`.

**Drawing brush palette:** `#111827`, `#6b7280`, `#ef4444`, `#f97316`, `#eab308`,
`#22c55e`, `#2563eb`, `#7c3aed`. Brush sizes: **4 / 8 / 14 px**. Tools: pen, undo, redo, eraser.

### Type
- **Display / headings:** `Paytone One` (H1 "Telestrations" 44px; screen titles ~26–28px).
- **UI / body:** `Outfit` (weights 400–800). Eyebrows: 700, ~11px, uppercase, letter-spacing ~1.6px.
- **Mono:** `ui-monospace, Menlo` for timers (`0:42`) and room code.
- Loaded via Google Fonts in the mock; for the app use `next/font` (Paytone One + Outfit).

### Shape & elevation
- Radius: cards 14px, inner cards/articles 12px, inputs & buttons 10px, small chips 8px, pills 999px.
- Shadows: raised card `0 1px 2px rgba(26,37,64,.05)`; canvas has an inset shadow.
- Reference screen width in the mock: **1020px** (desktop-first; app must also work on mobile).
- Animations: `bob` (floating half-pills), `blinkdot` (waiting indicator).

## Screens (7) and copy

Ordered as they appear; IDs are the doc's anchors.

### 1. `2g` Home — create / join  → `src/app/page.tsx`, `create-room-form.tsx`, `join-room-code-form.tsx`
- Eyebrow **TEAM DRAWING GAME**; H1 **Telestrations**; sub *"Create a room, send the invite link, and play one focused turn at a time."*
- **Create a room** card (Host badge): *"Start as host, then copy the room link for the team."* — field **Your name** (placeholder `Maya`); button **Create room** (terracotta, podium icon).
- **Join a room** card (Player badge): *"Use the room code or paste the invite link from your host."* — field **Room code or link** (placeholder `F7K2 or paste a room link`); button **Join room** (navy).
- 4 feature chips: **Prompt** *"Start with player-written prompts or a safe pack."* · **Draw** *"Each player sees only the prompt or guess before them."* · **Wait** *"Submitted players see who is still working."* · **Reveal** *"Walk through the finished chains and export the archive."*

### 2. `2a` Lobby + host settings  → `room/[code]/room-page-client.tsx` (pre-game)
- Eyebrow **ROOM F7K2**; invite chip `/room/F7K2` + **Copy invite link** button.
- Lobby list: *"6/15 players joined"*, **Waiting** badge. Rows show half-pill avatar + name; host has crown + **Host**; **YOU** marker; dashed *"Waiting for player 7…"* placeholder.
- Host controls: **Prompts** toggle `Players write` / `App pack`; **Timers** Drawing `90s`, Guessing `60s`; **Start game** button + note *"Needs at least 4 players for a good chain."*

### 3. `2b` Prompt turn  → `room-page-client.tsx` (active task: prompt)
- Turn chip **TURN 1**; eyebrow **YOUR MOVE**; title **Write a prompt**; timer `0:42`; progress `3 done / 2 pending / 5 total`.
- Banner *"You're starting a new chain — keep it short and work-safe."*
- Field **Your prompt** (sample `A project kickoff on roller skates`); helper *"Keep it safe for work."* + counter `33/80`; button **Send it down the line**.

### 4. `2c` Drawing turn  → `room-page-client.tsx` + `src/components/drawing-board.tsx`
- Turn chip **TURN 2**; title **Draw this**; timer `0:18` (**orange bg = urgency state**).
- Prompt banner: *"Prompt · turn 1 — \"A project kickoff on roller skates\""*.
- Toolbar: pen/undo/redo/eraser + 8 color swatches; canvas; brush sizes 4/8/14; button **Pass it on**.

### 5. `2d` Guess turn  → `room-page-client.tsx` (active task: guess)
- Turn chip **TURN 3**; title **What is this?**; timer `0:51`.
- Left: the drawing, caption *"Drawing · turn 2 · by Jordan"*.
- Right: field **Your guess** (placeholder `Type what you see…`); helper *"One clear guess is enough."* + `0/60`; button **Lock in guess**; note *"Only you can see this drawing. Your guess becomes the next player's prompt."*

### 6. `2e` Waiting room  → `room-page-client.tsx` (submitted, awaiting others)
- Blinking 3-dot indicator; title **You're in — 2 to go**; sub *"Stretch your drawing hand. The round moves when everyone submits."*
- Per-player status rows: green check + **Submitted**, or pending (cream row + spinner). Marks **YOU · HOST**.

### 7. `2f` Final reveal  → `room-page-client.tsx` (reveal) + `room/[code]/pdf-export.ts`
- Eyebrow **ROOM F7K2 · THE BIG FINISH**; title **Final reveal**; actions **Export PDF**, **‹ Prev**, **Next ›**.
- Left nav: chain list (`Chain 2 — started by Maya` active, plus Chains 1/3/4/5 by other starters).
- Right: **Maya's chain** + `2 / 5` counter; chain rendered as ordered turn cards:
  - Turn 1 · Prompt · Maya — *"A project kickoff on roller skates"*
  - Turn 2 · Drawing · Jordan — (drawing)
  - Turn 3 · Guess · Priya — *"Office roller derby"* · *"↳ close enough to be funny, wrong enough to be art"*

## Build mapping (at a glance)

| Design screen | Current file(s) |
| --- | --- |
| 2g Home | `src/app/page.tsx`, `src/app/create-room-form.tsx`, `src/app/join-room-code-form.tsx` |
| 2a Lobby | `src/app/room/[code]/room-page-client.tsx` |
| 2b/2c/2d/2e turns | `room-page-client.tsx`, `src/components/drawing-board.tsx`, `src/components/ui.tsx` |
| 2f Reveal | `room-page-client.tsx`, `src/app/room/[code]/pdf-export.ts` |
| Tokens (color/type) | `src/app/globals.css`, `src/app/layout.tsx` (fonts) |

**Gaps to confirm before building:** mobile/responsive layout (mock is desktop-only at 1020px);
whether host timer settings (90s/60s) and the "Players write / App pack" toggle already exist in
the Convex schema/domain; and the exact copy strings above vs. what's currently in the code.
