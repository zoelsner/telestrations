import { describe, expect, it } from "vitest";

import { getStartGameGate } from "./start-game";

describe("start game gate", () => {
  it("allows the host to start a lobby with enough players and no existing chains", () => {
    expect(
      getStartGameGate({
        existingChainCount: 0,
        isHost: true,
        playerCount: 3,
        roomStatus: "lobby",
      }),
    ).toEqual({ ok: true });
  });

  it("blocks non-hosts, started rooms, short lobbies, and duplicate chain setup", () => {
    expect(
      getStartGameGate({
        existingChainCount: 0,
        isHost: false,
        playerCount: 3,
        roomStatus: "lobby",
      }),
    ).toMatchObject({ code: "host_required", ok: false });

    expect(
      getStartGameGate({
        existingChainCount: 0,
        isHost: true,
        playerCount: 3,
        roomStatus: "active",
      }),
    ).toMatchObject({ code: "game_already_started", ok: false });

    expect(
      getStartGameGate({
        existingChainCount: 0,
        isHost: true,
        playerCount: 2,
        roomStatus: "lobby",
      }),
    ).toMatchObject({ code: "not_enough_players", ok: false });

    expect(
      getStartGameGate({
        existingChainCount: 1,
        isHost: true,
        playerCount: 3,
        roomStatus: "lobby",
      }),
    ).toMatchObject({ code: "game_already_started", ok: false });
  });
});
