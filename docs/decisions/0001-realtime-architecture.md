# 0001. Realtime Architecture And Transport Boundaries

Status: Accepted for MVP

Date: 2026-05-15

Issue: #16

## Context

This game has two different realtime profiles:

- Low-frequency authoritative game state: rooms, players, lobby settings, turn
  assignments, prompt submissions, drawing submissions, guess submissions,
  timers, reconnect, and final reveal.
- High-frequency drawing input: pointer movement, stroke previews, pressure,
  undo/redo, and canvas repainting while one player is actively drawing.

The MVP needs reliable turn handoff and reconnect behavior more than live stroke
streaming. Rooms are expected to support up to 15 players, with each player
submitting one completed answer per turn.

## Decision

Convex is the MVP source of truth for low-frequency game state:

- room lifecycle and invite codes
- player slots and anonymous session identity
- lobby settings and host actions
- chain ownership and turn assignments
- prompt, drawing, and guess submissions
- timer state and timeout handling
- reconnect state
- reveal state and archived result metadata

MVP drawing is local while the player draws. The browser captures strokes,
undo/redo state, and canvas previews locally during the turn. At submit time, or
when timeout handling requires it, the client sends one completed drawing payload
for that drawing turn. The drawing payload format is decided separately in #17.

Convex mutations validate turn ownership, submission idempotency, room status,
and payload limits. Convex queries/subscriptions keep the lobby, waiting states,
turn views, and reveal screen current.

The MVP does not stream strokes, show another player drawing live, support
collaborative drawing on one canvas, or replay drawings as stroke streams.

## Options Compared

### Convex

Best fit for the MVP authority layer. Convex combines durable data, server
functions, validation, and live subscriptions in one model, which maps cleanly to
turn-based room state and reveal data. The tradeoff is that Convex should not be
used as a high-frequency stroke bus; frequent pointer events would create noisy
mutations, unnecessary persistence pressure, and avoidable bandwidth.

### Liveblocks

Strong fit for presence, multiplayer canvas experiences, and collaborative
editing. It becomes more attractive if players need to watch strokes appear live
or draw together. For this MVP, it would add another realtime system before the
product needs one, and Convex would still be needed for durable game rules,
submissions, timers, reconnect, and reveal.

### PartyKit

Strong fit for custom low-latency WebSocket rooms and ephemeral per-room message
streams. It is a good candidate for a later live stroke transport because stroke
events can remain transient. For the MVP, it would require custom persistence,
server validation, reconnect semantics, and operational wiring that Convex gives
us directly for turn-based state.

### Supabase Realtime

Viable for Postgres-backed persistence plus realtime channels. It is a stronger
choice when the app wants SQL-first storage and broader relational querying. For
this game, the server-side action model, live queries, and compact backend shape
make Convex simpler for authoritative game orchestration. Supabase Realtime also
does not remove the need to design a separate high-frequency stroke channel if
live drawing enters scope.

## Trigger For A Second Transport

Add a second realtime transport only when the product requires at least one of:

- live stroke streaming
- collaborative drawing on the same canvas
- spectating in-progress drawings
- replaying drawings as a time-ordered stroke stream

If added, the second transport should be a non-authoritative event stream for
stroke or presence data. Convex should remain authoritative for rooms, turns,
submissions, timers, reconnect, and reveal unless a later decision record changes
that boundary.

## Consequences

- The MVP has one authoritative backend for game rules and room state.
- Drawing latency stays excellent because pointer handling and canvas repainting
  are local.
- Other players only see a drawing after the turn submits.
- Drawing payload limits, compression, raster/vector strategy, and PDF export
  quality must be specified in #17.
- Timeout behavior must define how a local partial drawing is submitted or how a
  missing drawing becomes a blank timeout entry.
- Future live drawing can be added without rewriting the authoritative game
  model, as long as the second transport remains event-only.

## Follow-Up Issues

- #17: specify drawing storage format and export pipeline.
- #18: define anonymous player identity and reconnect contract.
- #21: harden mobile and touch drawing experience.
- #22: define deterministic E2E and CI testing strategy.
