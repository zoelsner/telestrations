import { describe, expect, it } from "vitest";

import { bootstrapStatus } from "./bootstrap-status";

describe("bootstrapStatus", () => {
  it("records the scaffold surfaces expected by the first implementation slice", () => {
    expect(bootstrapStatus.items.map((item) => item.label)).toEqual([
      "Frontend",
      "Backend",
      "Workflow",
    ]);
  });
});
