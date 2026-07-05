import type { AssignmentStatus, EntryType, RoomStatus } from "./game-state";
import { MAX_GUESS_LENGTH, MAX_PROMPT_LENGTH } from "./submission";

export type ActiveTaskPreviousEntry =
  | {
      kind: "text";
      label: "Previous prompt" | "Previous guess";
      turn: number;
      value: string;
    }
  | {
      imageUrl: string;
      kind: "drawing";
      label: "Previous drawing";
      turn: number;
    }
  | {
      kind: "skipped";
      label: "Previous prompt" | "Previous guess" | "Previous drawing";
      turn: number;
      value: string;
    };

export type ActiveTaskAssignment = {
  entryType: EntryType;
  previousEntry?: ActiveTaskPreviousEntry;
  status: AssignmentStatus;
  submittedEntryId?: string | null;
  turn: number;
};

export type ActiveTaskView =
  | {
      currentTurn: number;
      entryType?: EntryType;
      state: "inactive" | "missing" | "waiting";
      title: string;
    }
  | {
      currentTurn: number;
      entryType: "prompt";
      inputLabel: "Your prompt";
      maxLength: typeof MAX_PROMPT_LENGTH;
      state: "compose";
      submitLabel: "Send it down the line";
      title: "Write a prompt";
    }
  | {
      currentTurn: number;
      entryType: "drawing";
      previousEntry?: ActiveTaskPreviousEntry;
      state: "compose";
      submitLabel: "Pass it on";
      title: "Draw this";
    }
  | {
      currentTurn: number;
      entryType: "guess";
      inputLabel: "Your guess";
      maxLength: typeof MAX_GUESS_LENGTH;
      previousEntry?: ActiveTaskPreviousEntry;
      state: "compose";
      submitLabel: "Lock in guess";
      title: "What is this?";
    };

export function buildActiveTaskView({
  assignment,
  currentTurn,
  roomStatus,
}: {
  assignment: ActiveTaskAssignment | null;
  currentTurn: number;
  roomStatus: RoomStatus;
}): ActiveTaskView {
  if (roomStatus !== "active") {
    return {
      currentTurn,
      state: "inactive",
      title: roomStatus === "reveal" ? "Ready for reveal" : "Game has not started",
    };
  }

  if (!assignment) {
    return {
      currentTurn,
      state: "missing",
      title: "No active task",
    };
  }

  if (assignment.status !== "pending" || assignment.submittedEntryId) {
    return {
      currentTurn,
      entryType: assignment.entryType,
      state: "waiting",
      title: "Waiting for the next turn",
    };
  }

  if (assignment.entryType === "prompt") {
    return {
      currentTurn,
      entryType: "prompt",
      inputLabel: "Your prompt",
      maxLength: MAX_PROMPT_LENGTH,
      state: "compose",
      submitLabel: "Send it down the line",
      title: "Write a prompt",
    };
  }

  if (assignment.entryType === "drawing") {
    return {
      currentTurn,
      entryType: "drawing",
      ...(assignment.previousEntry === undefined
        ? {}
        : { previousEntry: assignment.previousEntry }),
      state: "compose",
      submitLabel: "Pass it on",
      title: "Draw this",
    };
  }

  return {
    currentTurn,
    entryType: "guess",
    inputLabel: "Your guess",
    maxLength: MAX_GUESS_LENGTH,
    ...(assignment.previousEntry === undefined ? {} : { previousEntry: assignment.previousEntry }),
    state: "compose",
    submitLabel: "Lock in guess",
    title: "What is this?",
  };
}
