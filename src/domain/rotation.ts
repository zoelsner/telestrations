import type { AssignmentStatus, EntryType } from "./game-state";

export const MIN_PLAYERS_PER_GAME = 3;

export type RotationPlayer = {
  id: string;
  order: number;
};

export type RotationChain = {
  id: string;
  order: number;
};

export type TurnAssignment = {
  chainId: string;
  chainOrder: number;
  entryType: EntryType;
  playerId: string;
  playerOrder: number;
  turn: number;
};

export type NextPhase =
  | {
      entryType: EntryType;
      status: "active";
      turn: number;
    }
  | {
      status: "reveal";
    };

export type TurnCompletionAssignment = {
  status: AssignmentStatus;
  submittedEntryId?: string | null;
};

export function finalTurnForPlayerCount(playerCount: number) {
  assertPlayerCount(playerCount);
  return playerCount - 1;
}

export function entryTypeForTurn(turn: number): EntryType {
  assertTurnNumber(turn);

  if (turn === 0) {
    return "prompt";
  }

  return turn % 2 === 1 ? "drawing" : "guess";
}

export function buildTurnAssignments({
  chains,
  players,
  turn,
}: {
  chains: RotationChain[];
  players: RotationPlayer[];
  turn: number;
}): TurnAssignment[] {
  assertTurnNumber(turn);

  if (players.length !== chains.length) {
    throw new Error("Rotation requires the same number of players and chains.");
  }

  assertPlayerCount(players.length);

  const finalTurn = finalTurnForPlayerCount(players.length);

  if (turn > finalTurn) {
    throw new Error(`Turn ${turn} is past final turn ${finalTurn}.`);
  }

  const playersByOrder = normalizeByOrder(players, "player");
  const chainsByOrder = normalizeByOrder(chains, "chain");
  const entryType = entryTypeForTurn(turn);

  return chainsByOrder.map((chain) => {
    const playerOrder = (chain.order + turn) % playersByOrder.length;
    const player = playersByOrder[playerOrder];

    if (!player) {
      throw new Error(`Missing player order ${playerOrder}.`);
    }

    return {
      chainId: chain.id,
      chainOrder: chain.order,
      entryType,
      playerId: player.id,
      playerOrder: player.order,
      turn,
    };
  });
}

export function nextPhaseAfterCompletedTurn({
  completedTurn,
  playerCount,
}: {
  completedTurn: number;
  playerCount: number;
}): NextPhase {
  assertTurnNumber(completedTurn);

  const finalTurn = finalTurnForPlayerCount(playerCount);

  if (completedTurn >= finalTurn) {
    return { status: "reveal" };
  }

  const turn = completedTurn + 1;

  return {
    entryType: entryTypeForTurn(turn),
    status: "active",
    turn,
  };
}

export function isTurnComplete({
  assignments,
  expectedAssignmentCount,
}: {
  assignments: TurnCompletionAssignment[];
  expectedAssignmentCount: number;
}) {
  if (
    !Number.isInteger(expectedAssignmentCount) ||
    expectedAssignmentCount < MIN_PLAYERS_PER_GAME ||
    assignments.length !== expectedAssignmentCount
  ) {
    return false;
  }

  return assignments.every((assignment) => {
    if (assignment.status === "submitted") {
      return Boolean(assignment.submittedEntryId);
    }

    return assignment.status === "skipped" || assignment.status === "expired";
  });
}

function assertPlayerCount(playerCount: number) {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS_PER_GAME) {
    throw new Error(`Rotation requires at least ${MIN_PLAYERS_PER_GAME} players.`);
  }
}

function assertTurnNumber(turn: number) {
  if (!Number.isInteger(turn) || turn < 0) {
    throw new Error("Turn must be a non-negative integer.");
  }
}

function normalizeByOrder<TItem extends { order: number }>(items: TItem[], label: string) {
  const orderedItems = [...items].sort((left, right) => left.order - right.order);

  orderedItems.forEach((item, expectedOrder) => {
    if (item.order !== expectedOrder) {
      throw new Error(`Invalid ${label} order sequence.`);
    }
  });

  return orderedItems;
}
