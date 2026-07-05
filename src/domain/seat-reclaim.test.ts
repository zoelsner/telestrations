import { describe, expect, it } from "vitest";

import { PRESENCE_TIMEOUT_MS } from "./presence";
import { getReclaimSeatGate } from "./seat-reclaim";

describe("getReclaimSeatGate", () => {
  const now = 100_000;
  const players = [
    { id: "host", tokenHash: "host-h", isHost: true, status: "connected" as const, lastSeenAt: 100_000 },
    { id: "dead", tokenHash: "dead-h", isHost: false, status: "connected" as const, lastSeenAt: 0 },
    { id: "live", tokenHash: "live-h", isHost: false, status: "connected" as const, lastSeenAt: 99_000 },
    { id: "gone", tokenHash: "gone-h", isHost: false, status: "removed" as const, lastSeenAt: 0 },
  ];
  const base = {
    claimantTokenHash: "new-h",
    now,
    players,
    roomStatus: "active" as const,
    targetPlayerId: "dead",
  };

  it("allows reclaiming a disconnected non-host seat", () => {
    expect(getReclaimSeatGate(base)).toEqual({ ok: true, targetPlayerId: "dead" });
  });

  it("rejects when the room is not active", () => {
    for (const roomStatus of ["lobby", "reveal", "archived"] as const) {
      expect(getReclaimSeatGate({ ...base, roomStatus })).toMatchObject({
        code: "room_not_active",
        ok: false,
      });
    }
  });

  it("rejects an unknown target seat", () => {
    expect(getReclaimSeatGate({ ...base, targetPlayerId: "missing" })).toMatchObject({
      code: "seat_not_found",
      ok: false,
    });
  });

  it("rejects a removed seat", () => {
    expect(getReclaimSeatGate({ ...base, targetPlayerId: "gone" })).toMatchObject({
      code: "seat_removed",
      ok: false,
    });
  });

  it("rejects the host seat even when stale", () => {
    expect(getReclaimSeatGate({ ...base, targetPlayerId: "host" })).toMatchObject({
      code: "host_seat",
      ok: false,
    });
  });

  it("rejects a seat that is still active (fresh)", () => {
    expect(getReclaimSeatGate({ ...base, targetPlayerId: "live" })).toMatchObject({
      code: "seat_active",
      ok: false,
    });
  });

  it("treats the presence timeout boundary strictly", () => {
    const boundaryPlayers = [
      ...players.filter((player) => player.id !== "dead"),
      { id: "dead", tokenHash: "dead-h", isHost: false, status: "connected" as const, lastSeenAt: now - PRESENCE_TIMEOUT_MS },
    ];

    expect(
      getReclaimSeatGate({ ...base, players: boundaryPlayers, targetPlayerId: "dead" }),
    ).toMatchObject({ code: "seat_active", ok: false });

    const justOverPlayers = [
      ...players.filter((player) => player.id !== "dead"),
      {
        id: "dead",
        tokenHash: "dead-h",
        isHost: false,
        status: "connected" as const,
        lastSeenAt: now - PRESENCE_TIMEOUT_MS - 1,
      },
    ];

    expect(
      getReclaimSeatGate({ ...base, players: justOverPlayers, targetPlayerId: "dead" }),
    ).toEqual({ ok: true, targetPlayerId: "dead" });
  });

  it("rejects a claimant who already holds a different live seat", () => {
    expect(getReclaimSeatGate({ ...base, claimantTokenHash: "live-h" })).toMatchObject({
      code: "already_seated",
      ok: false,
    });
  });

  it("allows a claimant to idempotently re-tap the seat it already owns", () => {
    expect(getReclaimSeatGate({ ...base, claimantTokenHash: "dead-h" })).toEqual({
      ok: true,
      targetPlayerId: "dead",
    });
  });
});
