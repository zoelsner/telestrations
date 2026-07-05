import { describe, expect, it } from "vitest";

import { getClaimSeatGate, getIssueRejoinLinkGate } from "./rejoin";

describe("getIssueRejoinLinkGate", () => {
  const base = {
    actor: { isHost: true, status: "connected" as const },
    target: { isHost: false, roomId: "room-1" },
    roomId: "room-1",
    roomStatus: "active" as const,
  };

  it("allows the host to issue a rejoin link for another seat", () => {
    expect(getIssueRejoinLinkGate(base)).toEqual({ ok: true });
  });

  it("allows issuing during lobby and reveal, not only active play", () => {
    expect(getIssueRejoinLinkGate({ ...base, roomStatus: "lobby" })).toEqual({ ok: true });
    expect(getIssueRejoinLinkGate({ ...base, roomStatus: "reveal" })).toEqual({ ok: true });
  });

  it("requires an active host actor", () => {
    expect(getIssueRejoinLinkGate({ ...base, actor: null })).toMatchObject({
      code: "player_not_found",
      ok: false,
    });
    expect(
      getIssueRejoinLinkGate({ ...base, actor: { isHost: true, status: "removed" } }),
    ).toMatchObject({
      code: "player_not_found",
      ok: false,
    });
    expect(
      getIssueRejoinLinkGate({ ...base, actor: { isHost: false, status: "connected" } }),
    ).toMatchObject({
      code: "host_required",
      ok: false,
    });
  });

  it("refuses to issue for an archived room", () => {
    expect(getIssueRejoinLinkGate({ ...base, roomStatus: "archived" })).toMatchObject({
      code: "room_archived",
      ok: false,
    });
  });

  it("requires a target that exists in this room", () => {
    expect(getIssueRejoinLinkGate({ ...base, target: null })).toMatchObject({
      code: "target_not_found",
      ok: false,
    });
    expect(
      getIssueRejoinLinkGate({ ...base, target: { isHost: false, roomId: "room-2" } }),
    ).toMatchObject({
      code: "target_not_found",
      ok: false,
    });
  });

  it("forbids issuing a rejoin link for the host's own seat", () => {
    expect(
      getIssueRejoinLinkGate({ ...base, target: { isHost: true, roomId: "room-1" } }),
    ).toMatchObject({
      code: "cannot_issue_for_host",
      ok: false,
    });
  });
});

describe("getClaimSeatGate", () => {
  const base = {
    claimantTokenHash: "claimant-hash",
    players: [
      { id: "host", tokenHash: "host-hash", isHost: true },
      { id: "seat", tokenHash: "old-device-hash", rejoinTokenHash: "secret-hash", isHost: false },
      { id: "other", tokenHash: "other-hash", isHost: false },
    ],
    rejoinSecretHash: "secret-hash",
    roomStatus: "active" as const,
  };

  it("binds the seat whose rejoin hash matches the secret", () => {
    expect(getClaimSeatGate(base)).toEqual({ ok: true, targetPlayerId: "seat" });
  });

  it("rejects a secret that matches no seat (unknown or already used)", () => {
    expect(getClaimSeatGate({ ...base, rejoinSecretHash: "mismatch" })).toMatchObject({
      code: "invalid_rejoin_link",
      ok: false,
    });
  });

  it("treats a cleared rejoin hash as single-use (no seat carries the secret anymore)", () => {
    const players = [
      { id: "host", tokenHash: "host-hash", isHost: true },
      { id: "seat", tokenHash: "old-device-hash", isHost: false },
      { id: "other", tokenHash: "other-hash", isHost: false },
    ];

    expect(getClaimSeatGate({ ...base, players })).toMatchObject({
      code: "invalid_rejoin_link",
      ok: false,
    });
  });

  it("rejects a claimant that already holds a different seat in this room", () => {
    expect(getClaimSeatGate({ ...base, claimantTokenHash: "other-hash" })).toMatchObject({
      code: "already_seated",
      ok: false,
    });
  });

  it("allows the seat owner to re-claim its own seat idempotently", () => {
    expect(getClaimSeatGate({ ...base, claimantTokenHash: "old-device-hash" })).toEqual({
      ok: true,
      targetPlayerId: "seat",
    });
  });

  it("refuses to claim in an archived room", () => {
    expect(getClaimSeatGate({ ...base, roomStatus: "archived" })).toMatchObject({
      code: "room_archived",
      ok: false,
    });
  });
});
