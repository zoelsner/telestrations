"use client";

import type { Id } from "../../../../convex/_generated/dataModel";
import { Panel } from "@/components/ui";
import { ActiveTaskSurface, type ActiveTask } from "../../room/[code]/room-page-client";

const ROOM_ID = "room-fixture" as Id<"rooms">;
const ASSIGNMENT_ID = "assignment-fixture" as Id<"assignments">;

const PLAYER_NAMES = ["Zach", "Maya", "Priya", "Diego", "Sam", "Noor"] as const;

const fixturePlayers: ActiveTask["round"]["players"] = PLAYER_NAMES.map((displayName, index) => ({
  assignmentId: `assignment-${index}` as Id<"assignments">,
  assignmentStatus: "pending",
  displayName,
  isCurrentPlayer: index === 0,
  isHost: index === 0,
  playerId: `player-${index}` as Id<"players">,
  playerStatus: "connected",
}));

const fixtureActiveTask: ActiveTask = {
  assignment: {
    id: ASSIGNMENT_ID,
    entryType: "drawing",
    previousEntry: {
      kind: "text",
      label: "Previous prompt",
      turn: 0,
      value: "Cold feet",
    },
    status: "pending",
    turn: 1,
  },
  currentPlayer: {
    id: "player-0" as Id<"players">,
    displayName: "Zach",
    isHost: true,
    status: "connected",
  },
  room: {
    code: "F7K2",
    currentEntryType: "drawing",
    currentTurn: 1,
    id: ROOM_ID,
    status: "active",
  },
  round: {
    completedCount: 0,
    pendingCount: fixturePlayers.length,
    players: fixturePlayers,
    skippedCount: 0,
    submittedCount: 0,
    totalCount: fixturePlayers.length,
  },
};

// Mirrors the focus-room shell in RoomPageLive so the harness exercises the
// same ancestor layout chain as the real drawing turn.
export function DrawingSurfacePreview() {
  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[var(--app-divider)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
              Room F7K2
            </p>
            <h1 className="font-display text-2xl text-[var(--app-foreground)] sm:text-[28px]">
              Pass the Doodle
            </h1>
          </div>
        </header>

        <section className="flex flex-1 py-4 sm:py-5">
          <Panel className="order-1 flex-1 overflow-hidden">
            <ActiveTaskSurface
              activeTask={fixtureActiveTask}
              code="F7K2"
              playerToken="drawing-surface-harness-token"
            />
          </Panel>
        </section>
      </div>
    </main>
  );
}
