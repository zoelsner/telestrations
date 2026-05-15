import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STATUSES,
  ENTRY_TYPES,
  MAX_PLAYERS_PER_ROOM,
  PLAYER_STATUSES,
  ROOM_STATUSES,
} from "./game-state";

describe("game state model", () => {
  it("keeps the MVP room capacity at 15 players", () => {
    expect(MAX_PLAYERS_PER_ROOM).toBe(15);
  });

  it("names every room state needed by the game lifecycle", () => {
    expect(ROOM_STATUSES).toEqual(["setup", "lobby", "active", "reveal", "archived"]);
  });

  it("supports the prompt, drawing, and guess entry cycle", () => {
    expect(ENTRY_TYPES).toEqual(["prompt", "drawing", "guess"]);
  });

  it("tracks reconnect and recovery states explicitly", () => {
    expect(PLAYER_STATUSES).toEqual(["connected", "disconnected", "removed"]);
    expect(ASSIGNMENT_STATUSES).toEqual(["pending", "submitted", "skipped", "expired"]);
  });
});
