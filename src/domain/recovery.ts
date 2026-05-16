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
