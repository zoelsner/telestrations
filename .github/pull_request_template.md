## Linked Issue

Closes #<issue-number>

## Before Any Code Checklist

- [ ] Linked issue is above
- [ ] Branch is not `main`
- [ ] Preflight or equivalent workspace check was run
- [ ] RED test was observed before non-test edits, when the slice changes behavior
- [ ] `docs/architecture.md` and `docs/development-plan.md` were checked for conflicts

## Scope

What coherent slice does this PR complete?

## Non-Goals

What is intentionally out of scope?

## Test Evidence

- [ ] Lint
- [ ] Format check
- [ ] Typecheck
- [ ] Unit/application tests
- [ ] Build
- [ ] Foundational E2E, if relevant

Commands run:

```text

```

## Architecture And Docs

- [ ] This follows `docs/architecture.md`
- [ ] Architecture docs were updated, if architecture changed
- [ ] No domain/application/infrastructure boundary violations were introduced

## Type Safety

- [ ] Runtime data is parsed or narrowed instead of cast
- [ ] No `as any`, `: any`, `<any>`, or `as unknown as` was introduced
- [ ] Any unavoidable type escape uses a documented `type-escape:` marker

## Risk And Rollback

What can go wrong, and how can this be rolled back?

## Dependencies

List new dependencies and explain why each is needed.
