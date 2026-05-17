# Deployment

## Current Production Frontend

The production app is live at:

```text
https://telestrations-gamma.vercel.app
```

The first Vercel production deploy was completed on May 17, 2026. A 10-player
automated production rehearsal completed successfully against this URL and
generated `telestrations-5PQW-2026-05-17.pdf`.

## Current Production Backend

Convex production is deployed at:

```text
https://intent-otter-982.convex.cloud
```

Use this value for the Vercel environment variable:

```text
NEXT_PUBLIC_CONVEX_URL=https://intent-otter-982.convex.cloud
```

Deploy Convex functions and schema with:

```bash
CONVEX_DEPLOYMENT=prod:intent-otter-982 npx convex deploy --typecheck enable
```

The first production deploy for this project was completed on May 16, 2026 and
added the current schema indexes.

## Vercel Project

The linked Vercel project is:

```text
zoelsners-projects/telestrations
```

Production has:

```text
NEXT_PUBLIC_CONVEX_URL=https://intent-otter-982.convex.cloud
```

Use the same value for preview environments until preview Convex deployments are
intentionally added.

## Deploy Steps

1. Re-authenticate the Vercel CLI if needed:

   ```bash
   vercel login
   ```

2. Confirm this repository is linked to Vercel:

   ```bash
   vercel project ls
   ```

3. Deploy production:

   ```bash
   vercel deploy --prod
   ```

4. Smoke-test the production URL:
   - Create a room.
   - Join from at least two separate browser contexts.
   - Start a game.
   - Submit prompt, drawing, and guess turns.
   - Verify reveal and PDF export.

## Rehearsal Checklist

Before treating this as fully launch-ready, run one real-device rehearsal with
10 to 15 players. The automated 10-player production rehearsal already passed,
but it does not replace real mobile/network coverage.

- Host creates a fresh room from production.
- Players join by link or room code without accounts.
- At least one mobile player completes drawing and guess turns.
- Host changes prompt source and timer settings before start.
- The group completes a full reveal.
- Host exports the PDF and shares it back to the team.
- Record follow-up issues for any slow joins, stuck turns, mobile drawing
  problems, or export failures.

## Known Auth State

On May 17, 2026, Convex and Vercel CLI auth worked, Convex production deployed,
and Vercel production deployed.
