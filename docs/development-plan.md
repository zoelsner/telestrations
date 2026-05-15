# Development Plan

## Build Order

1. Bootstrap Next.js, Convex, and baseline tooling.
2. Adopt repo guardrails and architecture docs.
3. Document realtime architecture and transport boundaries.
4. Specify drawing storage format and export pipeline.
5. Define anonymous player identity and reconnect contract.
6. Decide custom prompt MVP scope and validation rules.
7. Define Convex schema and core game state model.
8. Build visual direction and app shell.
9. Implement room creation, invite links, and anonymous join flow.
10. Build lobby screen and host controls.
11. Build drawing canvas.
12. Harden mobile and touch drawing.
13. Implement game rotation engine and turn progression.
14. Implement active round task views.
15. Add timer and timeout behavior.
16. Implement waiting, reconnect, and stuck-game recovery.
17. Add safe prompt packs and room themes.
18. Build final reveal flow.
19. Set up GitHub Actions CI.
20. Add PDF export and archive-friendly results output.
21. Deploy and run the 10 to 15 player rehearsal.

## Review Points

The next useful human review is for the decision issues:

- Realtime transport boundaries.
- Drawing storage format.
- Anonymous reconnect semantics.
- Custom prompt MVP scope.
- Deterministic E2E strategy.
