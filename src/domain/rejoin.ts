export type RejoinRoomStatus = "setup" | "lobby" | "active" | "reveal" | "archived";
export type RejoinPlayerStatus = "connected" | "disconnected" | "removed";

export type IssueRejoinLinkGateInput = {
  actor: { isHost: boolean; status: RejoinPlayerStatus } | null;
  target: { isHost: boolean; roomId: string } | null;
  roomId: string;
  roomStatus: RejoinRoomStatus;
};

export type IssueRejoinLinkGate =
  | { ok: true }
  | {
      code:
        | "cannot_issue_for_host"
        | "host_required"
        | "player_not_found"
        | "room_archived"
        | "target_not_found";
      message: string;
      ok: false;
    };

/**
 * Gate for a host issuing a single-use rejoin link for another seat. Pure: the
 * caller re-reads live state inside the mutation, generates the secret, and stores
 * only its hash on the target player after this gate passes.
 */
export function getIssueRejoinLinkGate(input: IssueRejoinLinkGateInput): IssueRejoinLinkGate {
  if (!input.actor || input.actor.status === "removed") {
    return issueError("player_not_found", "Player not found in this room.");
  }

  if (!input.actor.isHost) {
    return issueError("host_required", "Only the host can create a rejoin link.");
  }

  if (input.roomStatus === "archived") {
    return issueError("room_archived", "This room is archived.");
  }

  if (!input.target || input.target.roomId !== input.roomId) {
    return issueError("target_not_found", "That player is not in this room.");
  }

  if (input.target.isHost) {
    return issueError("cannot_issue_for_host", "The host seat cannot be handed off.");
  }

  return { ok: true };
}

function issueError(
  code: Exclude<IssueRejoinLinkGate, { ok: true }>["code"],
  message: string,
): IssueRejoinLinkGate {
  return { code, message, ok: false };
}

export type ClaimSeatPlayer<TId> = {
  id: TId;
  isHost: boolean;
  rejoinTokenHash?: string;
  tokenHash: string;
};

export type ClaimSeatGateInput<TId> = {
  claimantTokenHash: string;
  players: ClaimSeatPlayer<TId>[];
  rejoinSecretHash: string;
  roomStatus: RejoinRoomStatus;
};

export type ClaimSeatGate<TId> =
  | { ok: true; targetPlayerId: TId }
  | {
      code: "already_seated" | "invalid_rejoin_link" | "room_archived";
      message: string;
      ok: false;
    };

/**
 * Gate for claiming a seat from a rejoin link. Matches the secret hash against the
 * seat that carries it, then rebinds that seat to the claiming browser's token.
 * Single-use is enforced upstream by clearing the seat's rejoin hash on success, so
 * a used or unknown secret simply matches no seat here. A claimant that already
 * owns a different seat in this room is rejected to keep exactly one seat per token.
 */
export function getClaimSeatGate<TId>(input: ClaimSeatGateInput<TId>): ClaimSeatGate<TId> {
  if (input.roomStatus === "archived") {
    return claimError("room_archived", "This room is archived.");
  }

  const target = input.players.find(
    (player) =>
      player.rejoinTokenHash !== undefined && player.rejoinTokenHash === input.rejoinSecretHash,
  );

  if (!target) {
    return claimError("invalid_rejoin_link", "This rejoin link is no longer valid.");
  }

  const existingSeat = input.players.find((player) => player.tokenHash === input.claimantTokenHash);

  if (existingSeat && existingSeat.id !== target.id) {
    return claimError("already_seated", "You already hold a different seat in this room.");
  }

  return { ok: true, targetPlayerId: target.id };
}

function claimError<TId>(
  code: Exclude<ClaimSeatGate<TId>, { ok: true }>["code"],
  message: string,
): ClaimSeatGate<TId> {
  return { code, message, ok: false };
}
