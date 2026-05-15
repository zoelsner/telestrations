# Telestrations Agent Guide

<!-- BEGIN:nextjs-agent-rules -->

This repo uses a current Next.js release. Before relying on framework-specific
behavior, prefer the checked-in code and current docs over older assumptions.

<!-- END:nextjs-agent-rules -->

## Before Any Code

Before editing non-test application code, produce or confirm:

1. Linked GitHub issue for the slice.
2. Feature branch, not `main`.
3. Workspace check: `npm run check` when available, or the narrow command for the
   files being changed.
4. RED test evidence before behavior changes when practical.
5. Architecture/plan check against `docs/architecture.md` and
   `docs/development-plan.md`.

Docs, templates, and pure scaffold work can be exempt from RED test evidence, but
the PR should say why.

## Scope Discipline

- One issue per PR and one coherent slice per branch.
- Do not bundle opportunistic cleanup with feature work.
- Keep domain rules independent from Next.js and Convex adapters.
- Prefer direct imports; do not add barrel `index.ts` files.

## Type Safety

Avoid `as any`, `: any`, `<any>`, and `as unknown as`. If an escape is truly
unavoidable, add a nearby `type-escape:` comment explaining the runtime validation
or upstream limitation.

## Testing

- Domain tests live next to domain files as `*.test.ts`.
- Shared harnesses live under `test/`.
- Browser workflows will live under `e2e/` after the deterministic E2E strategy is
  defined.

## Commit Hygiene

Use Conventional Commit subjects such as `feat(room): add anonymous join flow`.
Non-trivial commits should include `Issue: #N` in the body.

## Recent Misses

None yet.
