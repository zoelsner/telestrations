import { isPlayerDisconnected, PRESENCE_TIMEOUT_MS } from "./presence";
import type { RejoinPlayerStatus, RejoinRoomStatus } from "./rejoin";

export type ReclaimSeatPlayer<TId> = {
  id: TId;
  isHost: boolean;
  lastSeenAt: number;
  status: RejoinPlayerStatus;
  tokenHash: string;
};

export type ReclaimSeatGateInput<TId> = {
  claimantTokenHash: string;
  now: number;
  players: ReclaimSeatPlayer<TId>[];
  roomStatus: RejoinRoomStatus;
  targetPlayerId: TId;
  timeoutMs?: number;
};

export type ReclaimSeatGate<TId> =
  | { ok: true; targetPlayerId: TId }
  | {
      code:
        | "already_seated"
        | "host_seat"
        | "room_not_active"
        | "seat_active"
        | "seat_not_found"
        | "seat_removed";
      message: string;
      ok: false;
    };

/**
 * Gate for a new device reclaiming an abandoned seat mid-game from the
 * disconnected-seat list. Disconnection is derived from `lastSeenAt` (never
 * from stored `status`, which is never written as "disconnected" today).
 * Rebinding mirrors `getClaimSeatGate`'s single-seat-per-token invariant.
 */
export function getReclaimSeatGate<TId>(input: ReclaimSeatGateInput<TId>): ReclaimSeatGate<TId> {
  if (input.roomStatus !== "active") {
    return reclaimError("room_not_active", "Seat reclaim is only available during an active game.");
  }

  const target = input.players.find((player) => player.id === input.targetPlayerId);

  if (!target) {
    return reclaimError("seat_not_found", "That seat is no longer in this room.");
  }

  if (target.status === "removed") {
    return reclaimError("seat_removed", "That seat was removed by the host.");
  }

  if (target.isHost) {
    return reclaimError("host_seat", "The host seat can't be reclaimed here.");
  }

  const existingSeat = input.players.find((player) => player.tokenHash === input.claimantTokenHash);

  if (existingSeat && existingSeat.id !== target.id) {
    return reclaimError("already_seated", "You already hold a different seat in this room.");
  }

  const timeoutMs = input.timeoutMs ?? PRESENCE_TIMEOUT_MS;

  if (!isPlayerDisconnected({ lastSeenAt: target.lastSeenAt, now: input.now, timeoutMs })) {
    return reclaimError("seat_active", "That player is back online — their seat can't be taken.");
  }

  return { ok: true, targetPlayerId: target.id };
}

function reclaimError<TId>(
  code: Exclude<ReclaimSeatGate<TId>, { ok: true }>["code"],
  message: string,
): ReclaimSeatGate<TId> {
  return { code, message, ok: false };
}
