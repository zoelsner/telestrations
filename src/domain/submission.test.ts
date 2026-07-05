import { describe, expect, it } from "vitest";

import { CANVAS_SIZE, DRAWING_BACKGROUND_COLOR } from "./drawing";
import {
  MAX_DRAWING_ARTIFACT_BYTES,
  MAX_GUESS_LENGTH,
  MAX_PROMPT_LENGTH,
  prepareEntrySubmission,
  validateDrawingBlob,
  type DrawingSubmission,
} from "./submission";

describe("entry submission", () => {
  it("normalizes prompt and guess text before storing", () => {
    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "prompt" }),
        currentEntryType: "prompt",
        currentTurn: 0,
        payload: { text: "  quarterly    planning   chaos  ", type: "prompt" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({
      ok: true,
      payload: { text: "quarterly planning chaos", type: "prompt" },
    });

    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "guess", turn: 2 }),
        currentEntryType: "guess",
        currentTurn: 2,
        payload: { text: "  a confusing roadmap  ", type: "guess" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({
      ok: true,
      payload: { text: "a confusing roadmap", type: "guess" },
    });
  });

  it("rejects invalid text submissions", () => {
    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "prompt" }),
        currentEntryType: "prompt",
        currentTurn: 0,
        payload: { text: "", type: "prompt" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "invalid_submission_payload", ok: false });

    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "prompt" }),
        currentEntryType: "prompt",
        currentTurn: 0,
        payload: { text: "a".repeat(MAX_PROMPT_LENGTH + 1), type: "prompt" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "invalid_submission_payload", ok: false });

    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "guess", turn: 2 }),
        currentEntryType: "guess",
        currentTurn: 2,
        payload: { text: "a".repeat(MAX_GUESS_LENGTH + 1), type: "guess" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "invalid_submission_payload", ok: false });
  });

  it("accepts a drawing payload that matches the v1 storage contract", () => {
    const result = prepareEntrySubmission({
      assignment: pendingAssignment({ entryType: "drawing", turn: 1 }),
      currentEntryType: "drawing",
      currentTurn: 1,
      payload: { drawing: validDrawing(), type: "drawing" },
      playerId: "player-1",
      roomStatus: "active",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: { drawing: { version: 1 }, type: "drawing" },
    });
  });

  it("does not persist stroke vectors", () => {
    const result = prepareEntrySubmission({
      assignment: pendingAssignment({ entryType: "drawing", turn: 1 }),
      currentEntryType: "drawing",
      currentTurn: 1,
      payload: { drawing: validDrawing(), type: "drawing" },
      playerId: "player-1",
      roomStatus: "active",
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.payload.type === "drawing") {
      expect("strokes" in result.payload.drawing).toBe(false);
    }
  });

  it("rejects malformed drawing payloads", () => {
    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "drawing", turn: 1 }),
        currentEntryType: "drawing",
        currentTurn: 1,
        payload: {
          drawing: {
            ...validDrawing(),
            artifact: { ...validDrawing().artifact, byteSize: 0 },
          },
          type: "drawing",
        },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "invalid_submission_payload", ok: false });
  });

  it("rejects a drawing whose PNG exceeds the size cap", () => {
    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "drawing", turn: 1 }),
        currentEntryType: "drawing",
        currentTurn: 1,
        payload: {
          drawing: {
            ...validDrawing(),
            artifact: {
              ...validDrawing().artifact,
              byteSize: MAX_DRAWING_ARTIFACT_BYTES + 1,
            },
          },
          type: "drawing",
        },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "invalid_submission_payload", ok: false });
  });

  it("accepts a drawing at exactly the size cap", () => {
    const result = prepareEntrySubmission({
      assignment: pendingAssignment({ entryType: "drawing", turn: 1 }),
      currentEntryType: "drawing",
      currentTurn: 1,
      payload: {
        drawing: {
          ...validDrawing(),
          artifact: {
            ...validDrawing().artifact,
            byteSize: MAX_DRAWING_ARTIFACT_BYTES,
          },
        },
        type: "drawing",
      },
      playerId: "player-1",
      roomStatus: "active",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects inactive, missing, wrong-player, wrong-turn, and duplicate submissions", () => {
    const base = {
      assignment: pendingAssignment({ entryType: "prompt" }),
      currentEntryType: "prompt" as const,
      currentTurn: 0,
      payload: { text: "team offsite", type: "prompt" as const },
      playerId: "player-1",
      roomStatus: "active" as const,
    };

    expect(prepareEntrySubmission({ ...base, roomStatus: "lobby" })).toMatchObject({
      code: "room_not_active",
      ok: false,
    });
    expect(prepareEntrySubmission({ ...base, assignment: null })).toMatchObject({
      code: "assignment_not_found",
      ok: false,
    });
    expect(prepareEntrySubmission({ ...base, playerId: "player-2" })).toMatchObject({
      code: "assignment_not_found",
      ok: false,
    });
    expect(
      prepareEntrySubmission({ ...base, assignment: pendingAssignment({ turn: 1 }) }),
    ).toMatchObject({ code: "stale_assignment", ok: false });
    expect(
      prepareEntrySubmission({
        ...base,
        assignment: {
          ...pendingAssignment({}),
          status: "submitted",
          submittedEntryId: "entry-1",
        },
      }),
    ).toMatchObject({ code: "assignment_already_submitted", ok: false });
  });

  it("rejects payloads that do not match the current entry type", () => {
    expect(
      prepareEntrySubmission({
        assignment: pendingAssignment({ entryType: "prompt" }),
        currentEntryType: "prompt",
        currentTurn: 0,
        payload: { text: "a guess too early", type: "guess" },
        playerId: "player-1",
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "wrong_entry_type", ok: false });
  });
});

describe("validateDrawingBlob", () => {
  it("rejects a missing blob without deleting anything", () => {
    expect(validateDrawingBlob(null)).toEqual({
      ok: false,
      reason: "Drawing upload is missing.",
    });
  });

  it("rejects an oversize blob and requests deletion", () => {
    expect(
      validateDrawingBlob({
        size: MAX_DRAWING_ARTIFACT_BYTES + 1,
        contentType: "image/png",
      }),
    ).toEqual({
      ok: false,
      reason: "Drawing image is too large.",
    });
  });

  it("rejects a blob with the wrong content type and requests deletion", () => {
    expect(
      validateDrawingBlob({
        size: 2048,
        contentType: "image/jpeg",
      }),
    ).toEqual({
      ok: false,
      reason: "Drawing image is invalid.",
    });
  });

  it("rejects a blob with a missing content type and requests deletion", () => {
    expect(
      validateDrawingBlob({
        size: 2048,
      }),
    ).toEqual({
      ok: false,
      reason: "Drawing image is invalid.",
    });
  });

  it("accepts a PNG blob exactly at the size cap", () => {
    expect(
      validateDrawingBlob({
        size: MAX_DRAWING_ARTIFACT_BYTES,
        contentType: "image/png",
      }),
    ).toEqual({ ok: true });
  });
});

function pendingAssignment({
  entryType = "prompt",
  turn = 0,
}: {
  entryType?: "prompt" | "drawing" | "guess";
  turn?: number;
}) {
  return {
    entryType,
    playerId: "player-1",
    status: "pending" as const,
    submittedEntryId: null,
    turn,
  };
}

function validDrawing(): DrawingSubmission {
  return {
    artifact: {
      byteSize: 2048,
      height: CANVAS_SIZE.height,
      mimeType: "image/png",
      storageId: "storage-1",
      width: CANVAS_SIZE.width,
    },
    background: {
      color: DRAWING_BACKGROUND_COLOR,
      type: "solid",
    },
    canvas: CANVAS_SIZE,
    version: 1,
  };
}
