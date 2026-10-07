# Convex cleanup verification — October 7, 2026

## Source and deployed state

Canonical checkout: `~/Library/Mobile Documents/com~apple~CloudDocs/Projects/telestrations`.
Its `codex/doodle-verification-20260910` branch is at `57150da`, two documentation
files ahead of remote `main`. Application code matches `be2df11a0bf241463ab7f998d1e90f2f8683282a`.
The existing untracked `.claude/` and `docs/app-data-flow.md` were left untouched.
This change was developed in a separate checkout on
`codex/convex-cleanup-bounds-20261007`.

Read-only Vercel inspection reports production deployment
`dpl_FC97UnkXXbwsgg45Scz5PoC8UPUw`, READY, with the same `be2df11` source commit
and `www.passthedoodle.com` alias. GitHub reports successful
[Convex deployment](https://github.com/zoelsner/telestrations/actions/runs/29740069953)
and [CI](https://github.com/zoelsner/telestrations/actions/runs/29740069944)
for that commit. Workflow evidence does not prove that no subsequent manual
backend changes occurred. A fresh read-only `convex function-spec --prod` confirmed
21 deployed functions. All 15 public function specifications exactly match the
local version; the only addition is the internal cleanup worker.

Production Convex deployment triggers are `main`, the preexisting
`claude/website-update-error-fix-n72hwh` branch, and manual workflow dispatch.
The new branch matches neither push trigger. Its `vercel.json` disables Vercel
Git deployments for that exact branch; other branches retain their defaults.
No deployment, migration, production game mutation, or paid API call was made.

## Confirmed defect and fix

[Issue #104](https://github.com/zoelsner/telestrations/issues/104): the original
orphan sweep collected every entry, every storage metadata row, and every
rate-limit row before limiting deletions. The 50-deletion cap did not bound reads.
Retained stroke history can exceed the transaction bandwidth limit and prevent
all orphan and stale-rate-limit cleanup in that invocation.

The sweep now reads at most 50 storage metadata rows and 50 expired rate-limit
rows. A durable cursor advances even when every visited blob is referenced.
Each aged candidate gets an internal worker that rechecks blob age/existence and
one indexed live drawing reference inside the deletion transaction. The nested
index uses the existing payload artifact ID, including legacy entries; no field
backfill or required-field change is needed. Isolating reference checks prevents
multiple large stroke documents from exhausting a single sweep transaction.

The test-only `convex-test@0.0.54` dependency integrates with existing Vitest and
supports the unchanged locked `convex@1.39.1`. Tests enable transaction limits.
Coverage includes a protected first page, deleted cursor rows, scan wraparound,
fresh uploads, the TTL boundary, bounded pruning, references inserted after
scheduling, missing blobs, mixed entry payloads, and a read budget smaller than
retained stroke history. The old page-boundary behavior was observed RED before
the source change. A strict-budget fixture also rejects the original full-table
read while the new cleanup succeeds.

The existing E2E script had a separate verification-path defect: a second CI run
with an existing anonymous local config attempted cloud deployment selection and
failed with `InvalidDeploymentName: anonymous-agent`. CI and explicit anonymous
mode now consistently skip that selection. Explicit deployment environment keys
can still take precedence inside the Convex CLI; the tested checkout has no
cloud keys and `.env.local` points to `http://127.0.0.1:3210`.
Local `.convex` credentials and database files are now Git-ignored.

## Verification

- `npm run check`: lint, formatting, typecheck, 131 tests passed in 22 files.
- `npm run build`: passed, including TypeScript and all generated routes.
- Local `convex dev`: schema and functions accepted by the real local backend.
- Independent Convex review: no remaining blockers after adding read-budget and
  delayed-reference regression coverage; all five cleanup regressions passed.
- Local browser E2E: 14 passed, five intentional mobile skips, one app-shell
  navigation flake passed on retry. This includes full three-player prompt /
  drawing / guess / reveal / PDF export, refresh reconnect, stuck-turn recovery,
  prompt-pack start, seat reclaim, and desktop/mobile drawing layouts.
- Real-engine local probe: 70 legacy entries with 500,000-byte stroke IDs
  (approximately 35 MB of history). A full-table history query failed with
  `Too many bytes read`; a nested indexed legacy-reference lookup returned true,
  and the new bounded sweep returned null successfully against the same history.
  Temporary internal probe functions were removed before committing.
- Navigation recheck with retries disabled: one passed.

Initial browser attempts encountered a cold-start timeout and a missing
Playwright browser. Chromium was installed in this task's own cache. No existing
interactive browser sessions were used or closed.

## Limits and follow-ups

The sweep visits 50 blobs per hour, including referenced drawings. A complete
scan therefore takes approximately `ceil(blob count / 50)` hourly invocations,
plus any time until the next cron. Cleanup latency grows with retained storage;
higher-volume usage needs a measured page/cadence adjustment or bounded chained
pages. Workers add scheduled function calls. No usage baseline, production
billing, or net cost reduction was measured, so this is a read-bound reliability
fix, not a claim of savings.

Other growth-related reads remain in `sweepExpiredTurns` (all active rooms) and
`sweepRoomLifecycle` (all rooms per status). These deserve separate bounded
slices. Room-scoped collections are bounded by the game size (15 players) rather
than the total deployment history.

The mutation paths use room-scoped bearer tokens, membership checks, host gates,
and Convex transactions; refresh/reclaim and full game behavior are covered by
the local browser suite. This audit did not establish a new concurrency flaw in
those paths. Finished-room reads currently return chains for a validly formatted
token even when it is not a member; whether completed-room links should be public
or member-only needs an explicit product decision before changing compatibility.

Presence writes happen every 15 seconds per connected lobby/active player.
Because lobby and active-task queries read player documents, those writes can
invalidate subscriptions. The configured rate is four heartbeat mutations per
minute per player; actual invocation counts and query fanout were not measured.
Separating presence from stable player state is a candidate only after measuring
usage.

A separate `npm audit --omit=dev` on the locked production dependency graph
reported eight affected packages (one critical, five high, two moderate). Next.js
16.2.6 and the Convex SDK's `ws` dependency are among them. No exploit against this
app was attempted or established. The app has no `next/og` or Server Action code;
its two drawing images use `unoptimized`, and the deployment is Vercel rather than
Windows. These distinctions matter for the reported Next.js advisories
([ImageResponse](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j),
[AVIF optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)).
Dependency upgrades should be a separate tested slice; no runtime dependency was
upgraded in this PR.
