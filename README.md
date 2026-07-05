# Pass the Doodle

A modern team drawing and guessing game built with Next.js and Convex.

This repo is public, but the app is still an MVP under active development. It is
designed for anonymous room-code play with a small trusted team, not account
authentication.

Production app: [https://telestrations-gamma.vercel.app](https://telestrations-gamma.vercel.app)

## Getting Started

Use Node `22.13.0` or newer on the supported LTS line. The repo includes
`.node-version` and `.nvmrc`.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Convex

The app can render the static shell without Convex, but live rooms and gameplay
state need a Convex deployment. Run Convex in a second terminal when you are
ready to create or connect the dev deployment:

```bash
npm run convex:dev
```

The Convex CLI writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Keep
`.env.local` private. The checked-in `.env.example` only documents the required
public browser env var name.

Room participation currently uses a room-scoped anonymous browser token stored
in `localStorage`. That token restores the same player slot on refresh, but it is
not an account system and should not be treated as strong authentication.

## Scripts

- `npm run dev`: start the Next.js dev server.
- `npm run build`: build the app.
- `npm run lint`: run ESLint.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run format:check`: verify Prettier formatting.
- `npm run test`: run Vitest.
- `npm run check`: lint, format check, typecheck, and unit tests.
- `npm run test:e2e`: run Playwright browser checks.
- `npm run ci`: full local quality gate: check, build, and E2E.

## Workflow

Work through GitHub issues one slice at a time. Before changing behavior, read:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/deployment.md` for production setup and rehearsal notes

## Current MVP State

Implemented foundations:

- Next.js app shell and responsive drawing workspace.
- Convex schema and room create/join flow.
- Anonymous room-scoped player tokens for refresh/reconnect basics.
- Local drawing canvas with colors, brush sizes, undo, redo, clear, and PNG export status.
- Rotation domain rules and Convex-backed turn progression.
- Active task views for prompt, drawing, and guess turns.
- Waiting/recovery state with host skip controls.
- Host-configurable timers and prompt source/theme settings.
- Final reveal with PDF export.
- CI with lint, format check, typecheck, unit tests, build, and Playwright.

Remaining launch work is tracked in GitHub issues, with the real-device 10 to 15
player rehearsal still to complete.
