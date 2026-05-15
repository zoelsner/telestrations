# Architecture

## Thesis

Telestrations is a realtime turn-based game with a tested domain core, a Next.js
App Router interface, and Convex as the durable game-state backend. High-frequency
canvas input stays local during a drawing turn; Convex receives submitted entries
and coordinates room state.

## Stack

- Next.js: browser app, routing, build pipeline, and deployment fit.
- TypeScript: strict application and domain contracts.
- Tailwind CSS: compact UI styling without a heavyweight component framework.
- Convex: live room state, durable game data, server-side validation, reconnect,
  timers, and reveal state.
- Vitest: fast domain and tooling tests.

## Boundaries

- `src/app`: Next.js routes, layouts, and UI composition.
- `src/domain`: framework-independent rules and data shapes.
- `src/components`: reusable UI components once shared UI emerges.
- `convex`: Convex schema and server functions.
- `docs`: architecture, workflow, and decision records.
- `test`: integration or tooling harnesses that are not colocated with source.
- `e2e`: Playwright tests once the deterministic E2E strategy is defined.

Domain code must not import from `src/app`, `convex`, Next.js, or browser-only
packages. UI and backend adapters can depend on the domain, not the other way
around.

## TypeScript Posture

- `strict` is required.
- `allowJs` is disabled.
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are enabled.
- Avoid type escapes. Any unavoidable escape must use a nearby `type-escape:`
  marker explaining why runtime validation makes it safe.
- `skipLibCheck` is currently true because the initial Next scaffold generated it;
  revisit after the dependency set stabilizes.

## Realtime Boundary

Convex is the source of truth for room lifecycle, lobby membership, settings,
turn assignments, submissions, timers, reconnect, and reveal data. It is not the
MVP transport for live collaborative drawing strokes. If live stroke streaming,
spectating, or collaborative drawing enters scope, evaluate Liveblocks or PartyKit
as a separate transport.

## Definition Of Done

- Linked issue and focused branch.
- Scope matches one issue.
- Lint, format check, typecheck, unit tests, and build pass.
- Architecture docs are updated when boundaries or stack decisions change.
- No untracked type escapes, lint disables, skipped tests, or boundary deviations.
- PR title follows Conventional Commit style.
