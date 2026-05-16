import { describe, expect, it } from "vitest";

import {
  CANVAS_SIZE,
  clearDrawing,
  commitStroke,
  createDrawingHistory,
  createStroke,
  redoDrawingChange,
  undoDrawingChange,
} from "./drawing";

describe("drawing domain", () => {
  it("uses a stable canvas coordinate space for exported drawings", () => {
    expect(CANVAS_SIZE).toEqual({ width: 960, height: 720 });
  });

  it("tracks strokes through undo, redo, and undo-safe clear", () => {
    const stroke = createStroke({
      color: "#111827",
      id: "stroke-1",
      point: { x: 120, y: 140, t: 10 },
      startedAt: 10,
      width: 8,
    });

    const withStroke = commitStroke(createDrawingHistory(), stroke);
    expect(withStroke.strokes).toHaveLength(1);
    expect(withStroke.canUndo).toBe(true);
    expect(withStroke.canRedo).toBe(false);

    const undone = undoDrawingChange(withStroke);
    expect(undone.strokes).toHaveLength(0);
    expect(undone.canUndo).toBe(false);
    expect(undone.canRedo).toBe(true);

    const redone = redoDrawingChange(undone);
    expect(redone.strokes).toHaveLength(1);
    expect(redone.canUndo).toBe(true);
    expect(redone.canRedo).toBe(false);

    const cleared = clearDrawing(redone);
    expect(cleared.strokes).toHaveLength(0);
    expect(cleared.canUndo).toBe(true);

    const restored = undoDrawingChange(cleared);
    expect(restored.strokes).toHaveLength(1);
  });
});
