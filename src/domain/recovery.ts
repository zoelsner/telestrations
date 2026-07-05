export type RecoveryRoomStatus = "setup" | "lobby" | "active" | "reveal" | "archived";
export type RecoveryPlayerStatus = "connected" | "disconnected" | "removed";
export type RecoveryAssignmentStatus = "pending" | "submitted" | "skipped" | "expired";

export type SkipAssignmentGateInput = {
  actor: { isHost: boolean; status: RecoveryPlayerStatus } | null;
  assignment: {
    roomId: string;
    status: RecoveryAssignmentStatus;
    turn: number;
  } | null;
  currentTurn: number;
  roomId: string;
  roomStatus: RecoveryRoomStatus;
};

export type SkipAssignmentGate =
  | { ok: true }
  | {
      code:
        | "assignment_not_found"
        | "assignment_not_pending"
        | "host_required"
        | "player_not_found"
        | "room_not_active"
        | "stale_assignment";
      message: string;
      ok: false;
    };

export function getSkipAssignmentGate(input: SkipAssignmentGateInput): SkipAssignmentGate {
  if (!input.actor || input.actor.status === "removed") {
    return recoveryError("player_not_found", "Player not found in this room.");
  }

  if (!input.actor.isHost) {
    return recoveryError("host_required", "Only the host can recover a stuck turn.");
  }

  if (input.roomStatus !== "active") {
    return recoveryError("room_not_active", "This room is not active.");
  }

  if (!input.assignment || input.assignment.roomId !== input.roomId) {
    return recoveryError("assignment_not_found", "No active assignment was found.");
  }

  if (input.assignment.turn !== input.currentTurn) {
    return recoveryError("stale_assignment", "This assignment is no longer active.");
  }

  if (input.assignment.status !== "pending") {
    return recoveryError("assignment_not_pending", "This assignment is not pending.");
  }

  return { ok: true };
}

function recoveryError(
  code: Exclude<SkipAssignmentGate, { ok: true }>["code"],
  message: string,
): SkipAssignmentGate {
  return { code, message, ok: false };
}

/**
 * Grace period after a turn's deadline before pending assignments are auto-expired.
 * Keeps a briefly-late submission or a manual host skip from racing the sweep.
 */
export const TURN_EXPIRY_GRACE_MS = 30_000;

export type TurnExpiryAssignment = {
  id: string;
  status: RecoveryAssignmentStatus;
};

export type TurnExpirySweepInput = {
  assignments: TurnExpiryAssignment[];
  deadlineAt: number | undefined;
  graceMs?: number;
  now: number;
  roomStatus: RecoveryRoomStatus;
};

export type TurnExpirySweep =
  | { shouldExpire: false }
  | { expiringAssignmentIds: string[]; shouldExpire: true };

/**
 * Decides whether a turn is stalled past its deadline plus grace and, if so, which
 * pending assignments should be marked "expired" to unblock the room. Pure: the
 * caller re-reads live state inside the mutation before acting on the result.
 */
export function getTurnExpirySweep(input: TurnExpirySweepInput): TurnExpirySweep {
  const graceMs = input.graceMs ?? TURN_EXPIRY_GRACE_MS;

  // Only active rooms with a running timer can stall. Timer-off rooms
  // (deadlineAt === undefined) are intentionally left untouched.
  if (input.roomStatus !== "active" || input.deadlineAt === undefined) {
    return { shouldExpire: false };
  }

  if (input.now < input.deadlineAt + graceMs) {
    return { shouldExpire: false };
  }

  const expiringAssignmentIds = input.assignments
    .filter((assignment) => assignment.status === "pending")
    .map((assignment) => assignment.id);

  if (expiringAssignmentIds.length === 0) {
    return { shouldExpire: false };
  }

  return { expiringAssignmentIds, shouldExpire: true };
}
