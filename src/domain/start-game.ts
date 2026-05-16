import type { RoomStatus } from "./game-state";
import { MIN_PLAYERS_PER_GAME } from "./rotation";

export type StartGameGateInput = {
  existingChainCount: number;
  isHost: boolean;
  playerCount: number;
  roomStatus: RoomStatus;
};

export type StartGameGate =
  | {
      ok: true;
    }
  | {
      code:
        | "game_already_started"
        | "host_required"
        | "invalid_chain_count"
        | "invalid_player_count"
        | "not_enough_players";
      message: string;
      ok: false;
    };

export function getStartGameGate({
  existingChainCount,
  isHost,
  playerCount,
  roomStatus,
}: StartGameGateInput): StartGameGate {
  if (!isHost) {
    return {
      code: "host_required",
      message: "Only the host can start the game.",
      ok: false,
    };
  }

  if (roomStatus !== "lobby" && roomStatus !== "setup") {
    return {
      code: "game_already_started",
      message: "This game has already started.",
      ok: false,
    };
  }

  if (!Number.isInteger(playerCount) || playerCount < 0) {
    return {
      code: "invalid_player_count",
      message: "Player count is invalid.",
      ok: false,
    };
  }

  if (playerCount < MIN_PLAYERS_PER_GAME) {
    return {
      code: "not_enough_players",
      message: `Start the game with at least ${MIN_PLAYERS_PER_GAME} players.`,
      ok: false,
    };
  }

  if (!Number.isInteger(existingChainCount) || existingChainCount < 0) {
    return {
      code: "invalid_chain_count",
      message: "Chain count is invalid.",
      ok: false,
    };
  }

  if (existingChainCount > 0) {
    return {
      code: "game_already_started",
      message: "This game already has chains.",
      ok: false,
    };
  }

  return { ok: true };
}
