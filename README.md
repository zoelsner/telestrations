# Telestrations

A modern team drawing and guessing game built with Next.js and Convex.

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

Run Convex in a second terminal when you are ready to create the dev deployment:

```bash
npm run convex:dev
```

The Convex CLI writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. The app can boot
without that value for scaffold work, but game-state features will require it.

## Scripts

- `npm run dev`: start the Next.js dev server.
- `npm run build`: build the app.
- `npm run lint`: run ESLint.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run format:check`: verify Prettier formatting.
- `npm run test`: run Vitest.
- `npm run check`: lint, format check, typecheck, and unit tests.
- `npm run ci`: full local CI gate for this initial scaffold.

## Workflow

Work through GitHub issues one slice at a time. Before changing behavior, read:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/development-plan.md`

## Current Scope

Issue #1 establishes the project shell and tooling only. Room creation, drawing,
turn rotation, timers, reconnect, reveal, and PDF export are intentionally split
into later issues.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
