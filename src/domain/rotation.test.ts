import { describe, expect, it } from "vitest";

import {
  buildTurnAssignments,
  entryTypeForTurn,
  finalTurnForPlayerCount,
  isTurnComplete,
  nextPhaseAfterCompletedTurn,
} from "./rotation";

describe("rotation engine", () => {
  it.each([3, 4, 10, 15])(
    "assigns every player and chain exactly once for a %i player game",
    (playerCount) => {
      const players = buildPlayers(playerCount);
      const chains = buildChains(playerCount);
      const finalTurn = finalTurnForPlayerCount(playerCount);
      const assignmentsByTurn = Array.from({ length: finalTurn + 1 }, (_, turn) =>
        buildTurnAssignments({ chains, players, turn }),
      );

      expect(finalTurn).toBe(playerCount - 1);

      for (const [turn, assignments] of assignmentsByTurn.entries()) {
        expect(assignments).toHaveLength(playerCount);
        expect(new Set(assignments.map((assignment) => assignment.playerId))).toHaveLength(
          playerCount,
        );
        expect(new Set(assignments.map((assignment) => assignment.chainId))).toHaveLength(
          playerCount,
        );

        for (const assignment of assignments) {
          expect(assignment.entryType).toBe(entryTypeForTurn(turn));
          expect(assignment.turn).toBe(turn);
          expect(assignment.playerOrder).toBe((assignment.chainOrder + turn) % playerCount);
        }
      }
    },
  );

  it.each([3, 4, 10, 15])(
    "never gives a player the same chain on consecutive turns in a %i player game",
    (playerCount) => {
      const players = buildPlayers(playerCount);
      const chains = buildChains(playerCount);
      const finalTurn = finalTurnForPlayerCount(playerCount);

      for (let turn = 1; turn <= finalTurn; turn += 1) {
        const previousAssignments = buildTurnAssignments({ chains, players, turn: turn - 1 });
        const currentAssignments = buildTurnAssignments({ chains, players, turn });

        for (const player of players) {
          const previousAssignment = previousAssignments.find(
            (assignment) => assignment.playerId === player.id,
          );
          const currentAssignment = currentAssignments.find(
            (assignment) => assignment.playerId === player.id,
          );

          expect(currentAssignment?.chainId).not.toBe(previousAssignment?.chainId);
        }
      }
    },
  );

  it("alternates prompt, drawing, and guess turns", () => {
    expect([0, 1, 2, 3, 4].map(entryTypeForTurn)).toEqual([
      "prompt",
      "drawing",
      "guess",
      "drawing",
      "guess",
    ]);
  });

  it("moves to reveal after the final turn", () => {
    expect(nextPhaseAfterCompletedTurn({ completedTurn: 2, playerCount: 4 })).toEqual({
      entryType: "drawing",
      status: "active",
      turn: 3,
    });

    expect(nextPhaseAfterCompletedTurn({ completedTurn: 3, playerCount: 4 })).toEqual({
      status: "reveal",
    });
  });

  it("detects turn completion only when every expected assignment is done", () => {
    expect(
      isTurnComplete({
        assignments: [
          { status: "submitted", submittedEntryId: "entry-1" },
          { status: "skipped" },
          { status: "expired" },
        ],
        expectedAssignmentCount: 3,
      }),
    ).toBe(true);

    expect(
      isTurnComplete({
        assignments: [
          { status: "submitted", submittedEntryId: "entry-1" },
          { status: "pending" },
          { status: "submitted", submittedEntryId: "entry-3" },
        ],
        expectedAssignmentCount: 3,
      }),
    ).toBe(false);

    expect(
      isTurnComplete({
        assignments: [
          { status: "submitted", submittedEntryId: "entry-1" },
          { status: "submitted" },
          { status: "submitted", submittedEntryId: "entry-3" },
        ],
        expectedAssignmentCount: 3,
      }),
    ).toBe(false);

    expect(
      isTurnComplete({
        assignments: [
          { status: "submitted", submittedEntryId: "entry-1" },
          { status: "submitted", submittedEntryId: "entry-2" },
        ],
        expectedAssignmentCount: 3,
      }),
    ).toBe(false);
  });

  it("rejects games with fewer than 3 players", () => {
    expect(() =>
      buildTurnAssignments({
        chains: buildChains(2),
        players: buildPlayers(2),
        turn: 0,
      }),
    ).toThrow("at least 3 players");
  });
});

function buildPlayers(count: number) {
  return Array.from({ length: count }, (_, order) => ({
    id: `player-${order}`,
    order,
  }));
}

function buildChains(count: number) {
  return Array.from({ length: count }, (_, order) => ({
    id: `chain-${order}`,
    order,
  }));
}
