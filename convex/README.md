# Convex Setup

This repo uses Convex for durable realtime game state: rooms, players, turn
assignments, submissions, timers, and reveal data.

For local development:

```bash
npm install
npm run convex:dev
```

The Convex CLI will prompt for a dev deployment and write `NEXT_PUBLIC_CONVEX_URL`
to `.env.local`. Keep `.env.local` out of git. Use `.env.example` as the shared
template.

The MVP should not stream every drawing stroke through Convex. Drawing input stays
local while a player draws; the completed drawing payload is submitted once per
turn.
