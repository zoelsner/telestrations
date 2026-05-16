import { describe, expect, it } from "vitest";

import {
  TIMER_SECONDS,
  getTurnDeadline,
  getTurnSubmissionGate,
  getTurnTimerState,
  validateTimerSeconds,
} from "./timer";

describe("timer domain rules", () => {
  it("accepts the MVP timer options", () => {
    expect(TIMER_SECONDS).toEqual([0, 60, 90, 120, 180]);
    expect(validateTimerSeconds(90)).toEqual({ ok: true, value: 90 });
    expect(validateTimerSeconds(45)).toMatchObject({
      ok: false,
      reason: "Timer must be off, 60s, 90s, 2 min, or 3 min.",
    });
  });

  it("computes deadlines for drawing and guessing turns", () => {
    const settings = {
      drawingSeconds: 90,
      guessingSeconds: 60,
    };

    expect(getTurnDeadline({ entryType: "drawing", settings, turnStartedAt: 1_000 })).toBe(91_000);
    expect(getTurnDeadline({ entryType: "guess", settings, turnStartedAt: 1_000 })).toBe(61_000);
    expect(
      getTurnDeadline({ entryType: "prompt", settings, turnStartedAt: 1_000 }),
    ).toBeUndefined();
    expect(
      getTurnDeadline({
        entryType: "drawing",
        settings: { ...settings, drawingSeconds: 0 },
        turnStartedAt: 1_000,
      }),
    ).toBeUndefined();
  });

  it("reports synchronized running and expired timer state", () => {
    expect(getTurnTimerState({ deadlineAt: undefined, now: 5_000 })).toEqual({
      state: "off",
    });
    expect(getTurnTimerState({ deadlineAt: 10_000, now: 8_100 })).toEqual({
      remainingSeconds: 2,
      state: "running",
    });
    expect(getTurnTimerState({ deadlineAt: 10_000, now: 10_001 })).toEqual({
      overdueSeconds: 1,
      state: "expired",
    });
  });

  it("rejects submissions after a configured deadline", () => {
    expect(getTurnSubmissionGate({ deadlineAt: undefined, now: 20_000 })).toEqual({ ok: true });
    expect(getTurnSubmissionGate({ deadlineAt: 20_000, now: 20_000 })).toEqual({ ok: true });
    expect(getTurnSubmissionGate({ deadlineAt: 20_000, now: 20_001 })).toMatchObject({
      code: "turn_expired",
      ok: false,
    });
  });
});
