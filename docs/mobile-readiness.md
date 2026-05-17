# Mobile Readiness

Desktop remains the primary layout for the MVP. Mobile support should preserve
the desktop grid and density at tablet and desktop breakpoints, while adding
phone-specific layout order, touch targets, and gesture handling.

## Current Contract

- The active drawing task appears before secondary lobby/context panels on phone
  widths.
- The home screen stacks create-room and join-room actions into clear full-width
  touch targets on phone widths.
- Joined-room lobby/setup actions appear before secondary context on phone
  widths.
- Canvas-like drawing surfaces fit inside the viewport without horizontal page
  overflow.
- Drawing surfaces use `touch-action: none` so the eventual canvas can handle
  pointer input without accidental scroll or pinch gestures.
- Toolbars can scroll horizontally within their own row instead of widening the
  page.
- Core buttons and inputs use larger phone-height targets, then return to the
  tighter desktop sizing at `sm` and above.

## Deferred Until Real Canvas

Issue #21 is not fully closed by the responsive shell alone. The real drawing
canvas still needs device-pixel-ratio scaling, pointer capture, stylus/pressure
behavior where available, and phone portrait/landscape QA against the production
drawing implementation.

## Manual QA Before Team Use

- iPhone-sized portrait viewport: draw task is first, toolbar controls are
  reachable, no horizontal page scroll.
- iPhone-sized landscape viewport: canvas remains usable and page scroll stays
  predictable.
- Tablet viewport: layout has more room but does not collapse desktop controls.
- Desktop viewport: the start screen and room shell preserve the desktop-first
  layout while active turns remain focused on one task.
- Refresh on a joined room still restores the anonymous player slot.
