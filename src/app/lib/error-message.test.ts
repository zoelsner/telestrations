import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

const FALLBACK = "Could not submit this drawing.";

describe("errorMessage", () => {
  it("returns the structured message from a ConvexError payload", () => {
    const error = new ConvexError({
      code: "turn_expired",
      message: "This turn has expired. The host can skip it to keep the game moving.",
    });

    expect(errorMessage(error, FALLBACK)).toBe(
      "This turn has expired. The host can skip it to keep the game moving.",
    );
  });

  it("returns a string ConvexError payload directly", () => {
    expect(errorMessage(new ConvexError("Room not found."), FALLBACK)).toBe("Room not found.");
  });

  it("falls back when a ConvexError payload has no usable message", () => {
    expect(errorMessage(new ConvexError({ code: "unknown" }), FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for redacted production server errors instead of echoing them", () => {
    const error = new Error(
      "[CONVEX M(rooms:submitEntry)] [Request ID: b01f421701d5194e] Server Error Called by client",
    );

    expect(errorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("keeps messages from plain client-side errors", () => {
    expect(errorMessage(new Error("Drawing upload failed."), FALLBACK)).toBe(
      "Drawing upload failed.",
    );
  });

  it("falls back for empty messages and non-error values", () => {
    expect(errorMessage(new Error("   "), FALLBACK)).toBe(FALLBACK);
    expect(errorMessage("boom", FALLBACK)).toBe(FALLBACK);
    expect(errorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
