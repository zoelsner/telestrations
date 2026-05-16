# Deployment

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

## Vercel Setup

The app is a standard Next.js deployment and should use Vercel for the first team
launch.

1. Re-authenticate the Vercel CLI if needed:

   ```bash
   vercel login
   ```

2. Link this repository to a Vercel project:

   ```bash
   vercel link
   ```

3. Add the Convex production URL to Vercel:

   ```bash
   vercel env add NEXT_PUBLIC_CONVEX_URL production
   vercel env add NEXT_PUBLIC_CONVEX_URL preview
   ```

   Use `https://intent-otter-982.convex.cloud` for both until preview Convex
   deployments are intentionally added.

4. Deploy production:

   ```bash
   vercel deploy --prod
   ```

5. Smoke-test the production URL:
   - Create a room.
   - Join from at least two separate browser contexts.
   - Start a game.
   - Submit prompt, drawing, and guess turns.
   - Verify reveal and PDF export.

## Rehearsal Checklist

Before sharing with the full team, run one real-device rehearsal with 10 to 15
players.

- Host creates a fresh room from production.
- Players join by link or room code without accounts.
- At least one mobile player completes drawing and guess turns.
- Host changes prompt source and timer settings before start.
- The group completes a full reveal.
- Host exports the PDF and shares it back to the team.
- Record follow-up issues for any slow joins, stuck turns, mobile drawing
  problems, or export failures.

## Known Auth State

On May 16, 2026, Convex CLI auth worked and production Convex deployed
successfully. Vercel CLI auth was not valid and needs a fresh `vercel login`
before the production frontend can be deployed.
