import { describe, expect, it } from "vitest";

import { TURN_EXPIRY_GRACE_MS, getSkipAssignmentGate, getTurnExpirySweep } from "./recovery";

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

describe("getTurnExpirySweep", () => {
  const deadlineAt = 10_000;
  const base = {
    assignments: [
      { id: "a-1", status: "pending" as const },
      { id: "a-2", status: "submitted" as const },
    ],
    deadlineAt,
    now: deadlineAt + TURN_EXPIRY_GRACE_MS + 1,
    roomStatus: "active" as const,
  };

  it("expires only the pending assignments once past the deadline plus grace", () => {
    expect(getTurnExpirySweep(base)).toEqual({
      expiringAssignmentIds: ["a-1"],
      shouldExpire: true,
    });
  });

  it("expires at exactly the deadline plus grace boundary", () => {
    expect(getTurnExpirySweep({ ...base, now: deadlineAt + TURN_EXPIRY_GRACE_MS })).toEqual({
      expiringAssignmentIds: ["a-1"],
      shouldExpire: true,
    });
  });

  it("does not expire before the grace period has passed", () => {
    expect(getTurnExpirySweep({ ...base, now: deadlineAt + TURN_EXPIRY_GRACE_MS - 1 })).toEqual({
      shouldExpire: false,
    });
  });

  it("does not expire a timer-off turn", () => {
    expect(getTurnExpirySweep({ ...base, deadlineAt: undefined })).toEqual({
      shouldExpire: false,
    });
  });

  it("does not expire when no assignments are still pending", () => {
    expect(
      getTurnExpirySweep({
        ...base,
        assignments: [
          { id: "a-1", status: "submitted" as const },
          { id: "a-2", status: "skipped" as const },
          { id: "a-3", status: "expired" as const },
        ],
      }),
    ).toEqual({ shouldExpire: false });
  });

  it("does not expire when the room is not active", () => {
    expect(getTurnExpirySweep({ ...base, roomStatus: "reveal" })).toEqual({
      shouldExpire: false,
    });
  });

  it("honors a custom grace period", () => {
    const graceMs = 5_000;
    expect(getTurnExpirySweep({ ...base, graceMs, now: deadlineAt + graceMs })).toEqual({
      expiringAssignmentIds: ["a-1"],
      shouldExpire: true,
    });
    expect(getTurnExpirySweep({ ...base, graceMs, now: deadlineAt + graceMs - 1 })).toEqual({
      shouldExpire: false,
    });
  });
});
