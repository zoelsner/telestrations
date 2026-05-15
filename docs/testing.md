# Testing Strategy

## Thesis

Tests should protect the game contract without turning CI into a slow multiplayer
rehearsal. Unit tests own deterministic rules, integration tests own adapter
contracts, and E2E tests own one stable browser path through the product.

This follows the repo-as-a-system playbook pattern: document the rule, encode it
in local commands, and let CI be the merge gate. Manual multiplayer rehearsal is
a launch gate, not the normal PR gate.

## Test Layers

### Unit Tests

Use Vitest for framework-independent rules in `src/domain`.

Examples:

- turn rotation and chain assignment
- active-task visibility: only the immediately previous entry is shown
- prompt validation
- drawing payload shape helpers
- timer and timeout calculations

Unit tests should be fast, deterministic, and run on every PR.

### Integration Tests

Use integration tests for server/client boundaries once those boundaries exist.

Examples:

- Convex mutation validation for join, submit, skip, and advance actions
- token-to-player-slot reconnect behavior
- drawing payload serialization and limits
- PDF export data assembly

These tests should use controlled fixtures and avoid real production services.

### E2E Tests

Use Playwright for the foundational user journey. E2E should verify that the app
is wired correctly in a browser, not exhaust every game permutation.

The first named E2E contract is `app-shell.spec.ts`:

1. Open the app.
2. Confirm the room shell renders.
3. Confirm the draw task shows only the immediately previous text entry.
4. Confirm the guess state shows only the previous drawing plus a guess input.
5. Confirm the lobby and round-status surfaces are visible.
6. Confirm the page has no horizontal overflow at desktop and mobile widths.

Once room creation and Convex-backed game state exist, replace the static shell
contract with a deterministic simulated-player flow:

1. Host creates a room.
2. Two or three players join with anonymous names in isolated browser contexts.
3. Host starts a short game.
4. Players submit deterministic prompts, drawings, and guesses.
5. The game reaches reveal with expected chain order.

## E2E Constraints

- No paid services.
- No uncontrolled network.
- No production Convex deployment in PR CI.
- No 10 to 15 player manual rehearsal in every PR.
- Use local or controlled test backends only.
- Keep screenshots optional unless the assertion needs visual evidence.

## Browser Matrix

PR CI starts with Chromium desktop and a Chromium mobile viewport. Once the
canvas and touch work matures, add pointer/touch-specific assertions and consider
WebKit coverage for Safari-class behavior. The launch rehearsal remains
responsible for the full 10 to 15 player test pass.

## Commands

Expected commands once issue #2 wires CI:

```bash
npm run check
npm run build
npm run test:e2e
```

`npm run ci` should run the stable merge gate. Local exploratory testing can use
narrower commands such as `npm run test:watch` or Playwright UI mode later.

## CI Relationship

Issue #2 should add GitHub Actions with the same gate this project expects
locally:

- lint
- format check
- typecheck
- unit tests
- production build
- foundational E2E

CI must not call a production Convex deployment or require external multiplayer
services. If a test needs backend state, use a local or controlled test backend
with deterministic fixtures.

## Launch Gate

The 10 to 15 player rehearsal is still required before team use. It belongs to
launch readiness, not normal PR CI, because it catches real-device and
coordination problems that deterministic CI should not try to simulate every
time.
