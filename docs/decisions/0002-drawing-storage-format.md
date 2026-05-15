# 0002 Drawing Storage Format

Status: Accepted
Issue: #17

## Context

Drawing input is high-frequency, but the MVP game loop is turn-based. Players draw
locally, then submit one drawing entry when the turn ends. Convex coordinates game
state and durable submissions; it is not the v1 transport for live stroke
streaming.

Active turn UI must only reveal the immediately previous entry in the chain. A
drawing turn sees the previous prompt or guess. A guess turn sees the previous
drawing. The full sequence appears only in the final reveal.

## Options

### Raster-only PNG

Store only a submitted PNG.

- Pros: simple reveal and PDF export, easy to render everywhere.
- Cons: no replay, weak future editing, harder to improve export quality later,
  and all semantic drawing data is lost after submission.

### Vector-only stroke JSON

Store only stroke paths and redraw them when needed.

- Pros: compact for simple drawings, replay-friendly, supports future edits.
- Cons: every reveal and PDF export depends on deterministic canvas rendering,
  and complex drawings may be slower to redraw on lower-end mobile devices.

### Hybrid stroke JSON plus PNG

Store stroke JSON as the source drawing data and a PNG artifact as the submitted
render.

- Pros: reliable reveal/PDF rendering, replay and future edit path remain open,
  no live stroke sync required, and mobile clients can render a static PNG after
  submission.
- Cons: stores duplicate representations and requires export validation at submit
  time.

## Decision

Use the hybrid format for v1: submitted drawings persist stroke JSON plus a
high-resolution PNG artifact. Stroke JSON is the editable/source representation.
The PNG is the canonical reveal and PDF artifact unless a later export pipeline
chooses to re-render from strokes.

This keeps the MVP reliable while preserving optional replay, edit, and export
improvements.

## Tentative Payload

Coordinates are in canvas coordinate space, not viewport pixels.

```ts
type DrawingPayloadV1 = {
  version: 1;
  canvas: {
    width: number;
    height: number;
  };
  background: {
    type: "solid";
    color: string;
  };
  strokes: Array<{
    id: string;
    color: string;
    width: number;
    points: Array<{
      x: number;
      y: number;
      pressure?: number;
      t?: number;
    }>;
    startedAt?: number;
    endedAt?: number;
  }>;
  artifact: {
    mimeType: "image/png";
    storageId: string;
    width: number;
    height: number;
    byteSize?: number;
  };
};
```

Timestamps are optional in v1. If present, `t`, `startedAt`, and `endedAt` support
future replay. If absent, the drawing still renders as a static submission.

## Implications

- PDF quality: use the PNG artifact for deterministic export. Generate it at a
  stable high resolution so archived results do not depend on a user's device
  pixel ratio.
- Bandwidth: no high-frequency network traffic during drawing. Submission sends
  one stroke payload plus one PNG artifact per drawing turn.
- Replay: stroke JSON supports later animated reveal when timestamps exist.
- Mobile performance: drawing stays local during the turn. After submission,
  reveal and waiting surfaces can display the PNG instead of redrawing strokes.
- Future edits: stroke data keeps room for undo history, cleanup tools, edit
  mode, or re-exporting at a different size.
