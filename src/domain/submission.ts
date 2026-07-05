import type { AssignmentStatus, EntryType, RoomStatus } from "./game-state";
import { DRAWING_PAYLOAD_VERSION } from "./game-state";
import { CANVAS_SIZE, DRAWING_BACKGROUND_COLOR } from "./drawing";

export const MAX_PROMPT_LENGTH = 160;
export const MAX_GUESS_LENGTH = 120;

// Hard ceiling on the declared PNG artifact size. A 960x720 canvas exported as PNG cannot
// exceed ~2.8 MB even for incompressible noise (raw RGBA is 960*720*4 = 2.76 MB and PNG
// adds only small overhead). 4 MiB leaves headroom so no legitimate export is ever
// rejected, while any larger declared size is a bug or abuse. Note: this bounds the
// CLIENT-DECLARED byteSize only; actual-blob enforcement is deferred (see design doc).
export const MAX_DRAWING_ARTIFACT_BYTES = 4 * 1024 * 1024;

const controlCharacterPattern = /[\u0000-\u001F\u007F]/;

export type TextSubmissionPayload = {
  text: string;
  type: "prompt" | "guess";
};

export type DrawingSubmission<TStorageId extends string = string> = {
  artifact: {
    byteSize?: number;
    height: number;
    mimeType: "image/png";
    storageId: TStorageId;
    width: number;
  };
  background: {
    color: string;
    type: "solid";
  };
  canvas: {
    height: number;
    width: number;
  };
  version: 1;
};

export type DrawingSubmissionPayload<TStorageId extends string = string> = {
  drawing: DrawingSubmission<TStorageId>;
  type: "drawing";
};

export type EntrySubmissionPayload<TStorageId extends string = string> =
  | TextSubmissionPayload
  | DrawingSubmissionPayload<TStorageId>;

export type SubmissionAssignment = {
  entryType: EntryType;
  playerId: string;
  status: AssignmentStatus;
  submittedEntryId?: string | null;
  turn: number;
};

export type PreparedEntrySubmission<TStorageId extends string = string> =
  | {
      entryType: EntryType;
      ok: true;
      payload: EntrySubmissionPayload<TStorageId>;
      turn: number;
    }
  | {
      code:
        | "assignment_already_submitted"
        | "assignment_not_found"
        | "assignment_not_pending"
        | "invalid_submission_payload"
        | "room_not_active"
        | "stale_assignment"
        | "wrong_entry_type";
      message: string;
      ok: false;
    };

type SubmissionErrorCode = Exclude<PreparedEntrySubmission, { ok: true }>["code"];

export function prepareEntrySubmission<TStorageId extends string>({
  assignment,
  currentEntryType,
  currentTurn,
  payload,
  playerId,
  roomStatus,
}: {
  assignment: SubmissionAssignment | null;
  currentEntryType: EntryType | undefined;
  currentTurn: number;
  payload: EntrySubmissionPayload<TStorageId>;
  playerId: string;
  roomStatus: RoomStatus;
}): PreparedEntrySubmission<TStorageId> {
  if (roomStatus !== "active") {
    return submissionError<TStorageId>(
      "room_not_active",
      "This room is not accepting submissions.",
    );
  }

  if (!assignment || assignment.playerId !== playerId) {
    return submissionError<TStorageId>("assignment_not_found", "No active assignment was found.");
  }

  if (assignment.turn !== currentTurn) {
    return submissionError<TStorageId>("stale_assignment", "This assignment is no longer active.");
  }

  if (assignment.submittedEntryId || assignment.status === "submitted") {
    return submissionError<TStorageId>(
      "assignment_already_submitted",
      "This assignment was already submitted.",
    );
  }

  if (assignment.status !== "pending") {
    return submissionError<TStorageId>("assignment_not_pending", "This assignment is not pending.");
  }

  if (payload.type !== currentEntryType || payload.type !== assignment.entryType) {
    return submissionError<TStorageId>(
      "wrong_entry_type",
      "Submission type does not match the active turn.",
    );
  }

  const payloadResult = validateAndNormalizePayload(payload);

  if (!payloadResult.ok) {
    return submissionError<TStorageId>("invalid_submission_payload", payloadResult.reason);
  }

  return {
    entryType: payload.type,
    ok: true,
    payload: payloadResult.payload,
    turn: currentTurn,
  };
}

function validateAndNormalizePayload<TStorageId extends string>(
  payload: EntrySubmissionPayload<TStorageId>,
):
  | {
      ok: true;
      payload: EntrySubmissionPayload<TStorageId>;
    }
  | {
      ok: false;
      reason: string;
    } {
  if (payload.type === "drawing") {
    const drawingResult = validateDrawing(payload.drawing);

    if (!drawingResult.ok) {
      return drawingResult;
    }

    const artifact = payload.drawing.artifact;

    return {
      ok: true,
      payload: {
        drawing: {
          artifact: {
            mimeType: "image/png",
            storageId: artifact.storageId,
            width: artifact.width,
            height: artifact.height,
            ...(artifact.byteSize === undefined ? {} : { byteSize: artifact.byteSize }),
          },
          background: { type: "solid", color: payload.drawing.background.color },
          canvas: { width: payload.drawing.canvas.width, height: payload.drawing.canvas.height },
          version: 1,
        },
        type: "drawing",
      },
    };
  }

  const textResult = normalizeSubmissionText(payload.text, maxLengthForTextType(payload.type));

  if (!textResult.ok) {
    return textResult;
  }

  return {
    ok: true,
    payload: {
      text: textResult.text,
      type: payload.type,
    },
  };
}

function normalizeSubmissionText(
  input: string,
  maxLength: number,
): { ok: true; text: string } | { ok: false; reason: string } {
  if (controlCharacterPattern.test(input)) {
    return { ok: false, reason: "Submission text cannot include control characters." };
  }

  const text = input.trim().replace(/\s+/g, " ");

  if (text.length === 0) {
    return { ok: false, reason: "Enter something before submitting." };
  }

  if (text.length > maxLength) {
    return { ok: false, reason: `Submission text must be ${maxLength} characters or fewer.` };
  }

  return { ok: true, text };
}

function maxLengthForTextType(type: "prompt" | "guess") {
  return type === "prompt" ? MAX_PROMPT_LENGTH : MAX_GUESS_LENGTH;
}

function validateDrawing<TStorageId extends string>(
  drawing: DrawingSubmission<TStorageId>,
): { ok: true } | { ok: false; reason: string } {
  if (drawing.version !== DRAWING_PAYLOAD_VERSION) {
    return { ok: false, reason: "Drawing payload version is invalid." };
  }

  if (drawing.canvas.width !== CANVAS_SIZE.width || drawing.canvas.height !== CANVAS_SIZE.height) {
    return { ok: false, reason: "Drawing canvas size is invalid." };
  }

  if (
    drawing.background.type !== "solid" ||
    drawing.background.color !== DRAWING_BACKGROUND_COLOR
  ) {
    return { ok: false, reason: "Drawing background is invalid." };
  }

  if (!isValidArtifact(drawing.artifact)) {
    return { ok: false, reason: "Drawing PNG artifact is invalid." };
  }

  if (
    drawing.artifact.byteSize !== undefined &&
    drawing.artifact.byteSize > MAX_DRAWING_ARTIFACT_BYTES
  ) {
    return { ok: false, reason: "Drawing image is too large." };
  }

  return { ok: true };
}

function isValidArtifact<TStorageId extends string>(
  artifact: DrawingSubmission<TStorageId>["artifact"],
) {
  if (artifact.mimeType !== "image/png") {
    return false;
  }

  if (artifact.storageId.trim().length === 0) {
    return false;
  }

  if (artifact.width !== CANVAS_SIZE.width || artifact.height !== CANVAS_SIZE.height) {
    return false;
  }

  return artifact.byteSize === undefined || isPositiveInteger(artifact.byteSize);
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function submissionError<TStorageId extends string>(
  code: SubmissionErrorCode,
  message: string,
): PreparedEntrySubmission<TStorageId> {
  return {
    code,
    message,
    ok: false,
  };
}
