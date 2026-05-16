import { describe, expect, it } from "vitest";

import { getSkipAssignmentGate } from "./recovery";

describe("recovery domain rules", () => {
  const base = {
    actor: { isHost: true, status: "connected" as const },
    assignment: {
      roomId: "room-1",
      status: "pending" as const,
      turn: 2,
    },
    currentTurn: 2,
    roomId: "room-1",
    roomStatus: "active" as const,
  };

  it("allows the host to skip a current pending assignment", () => {
    expect(getSkipAssignmentGate(base)).toEqual({ ok: true });
  });

  it("requires an active host player", () => {
    expect(getSkipAssignmentGate({ ...base, actor: null })).toMatchObject({
      code: "player_not_found",
      ok: false,
    });
    expect(
      getSkipAssignmentGate({ ...base, actor: { isHost: false, status: "connected" } }),
    ).toMatchObject({
      code: "host_required",
      ok: false,
    });
    expect(
      getSkipAssignmentGate({ ...base, actor: { isHost: true, status: "removed" } }),
    ).toMatchObject({
      code: "player_not_found",
      ok: false,
    });
  });

  it("requires an active room and current pending assignment", () => {
    expect(getSkipAssignmentGate({ ...base, roomStatus: "lobby" })).toMatchObject({
      code: "room_not_active",
      ok: false,
    });
    expect(getSkipAssignmentGate({ ...base, assignment: null })).toMatchObject({
      code: "assignment_not_found",
      ok: false,
    });
    expect(
      getSkipAssignmentGate({
        ...base,
        assignment: { ...base.assignment, status: "submitted" },
      }),
    ).toMatchObject({
      code: "assignment_not_pending",
      ok: false,
    });
  });

  it("rejects assignments from another room or turn", () => {
    expect(
      getSkipAssignmentGate({
        ...base,
        assignment: { ...base.assignment, roomId: "room-2" },
      }),
    ).toMatchObject({
      code: "assignment_not_found",
      ok: false,
    });
    expect(
      getSkipAssignmentGate({
        ...base,
        assignment: { ...base.assignment, turn: 1 },
      }),
    ).toMatchObject({
      code: "stale_assignment",
      ok: false,
    });
  });
});
