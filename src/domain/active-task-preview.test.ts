import { describe, expect, it } from "vitest";

import { activeTaskPreview } from "./active-task-preview";

describe("activeTaskPreview", () => {
  it("only exposes the immediately previous entry during active play", () => {
    expect(activeTaskPreview.drawTask.visibleEntry.kind).toBe("text");
    expect(activeTaskPreview.guessTask.visibleEntry.kind).toBe("drawing");
    expect(activeTaskPreview.drawTask.visibleEntry.turn).toBe(
      activeTaskPreview.drawTask.currentTurn - 1,
    );
    expect(activeTaskPreview.guessTask.visibleEntry.turn).toBe(
      activeTaskPreview.guessTask.currentTurn - 1,
    );
  });

  it("keeps full chain history out of active tasks", () => {
    expect("chain" in activeTaskPreview.drawTask).toBe(false);
    expect("chain" in activeTaskPreview.guessTask).toBe(false);
    expect("history" in activeTaskPreview.drawTask).toBe(false);
    expect("history" in activeTaskPreview.guessTask).toBe(false);
  });
});
