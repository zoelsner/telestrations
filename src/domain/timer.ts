import type { EntryType } from "./game-state";

export const TIMER_SECONDS = [0, 60, 90, 120, 180] as const;
export type TimerSeconds = (typeof TIMER_SECONDS)[number];

export type TurnTimerSettings = {
  drawingSeconds: number;
  guessingSeconds: number;
};

export type TurnTimerState =
  | { state: "off" }
  | { remainingSeconds: number; state: "running" }
  | { overdueSeconds: number; state: "expired" };

export type TurnSubmissionGate =
  | { ok: true }
  | {
      code: "turn_expired";
      message: string;
      ok: false;
    };

export function validateTimerSeconds(
  value: number,
): { ok: true; value: TimerSeconds } | { ok: false; reason: string } {
  if (TIMER_SECONDS.includes(value as TimerSeconds)) {
    return { ok: true, value: value as TimerSeconds };
  }

  return {
    ok: false,
    reason: "Timer must be off, 60s, 90s, 2 min, or 3 min.",
  };
}

export function getTurnDeadline({
  entryType,
  settings,
  turnStartedAt,
}: {
  entryType: EntryType;
  settings: TurnTimerSettings;
  turnStartedAt: number;
}): number | undefined {
  const durationSeconds = durationSecondsForEntryType(entryType, settings);

  if (durationSeconds === 0) {
    return undefined;
  }

  return turnStartedAt + durationSeconds * 1_000;
}

export function getTurnTimerState({
  deadlineAt,
  now,
}: {
  deadlineAt: number | undefined;
  now: number;
}): TurnTimerState {
  if (deadlineAt === undefined) {
    return { state: "off" };
  }

  if (now <= deadlineAt) {
    return {
      remainingSeconds: Math.ceil((deadlineAt - now) / 1_000),
      state: "running",
    };
  }

  return {
    overdueSeconds: Math.ceil((now - deadlineAt) / 1_000),
    state: "expired",
  };
}

export function getTurnSubmissionGate({
  deadlineAt,
  now,
}: {
  deadlineAt: number | undefined;
  now: number;
}): TurnSubmissionGate {
  const timerState = getTurnTimerState({ deadlineAt, now });

  if (timerState.state !== "expired") {
    return { ok: true };
  }

  return {
    code: "turn_expired",
    message: "This turn has expired. The host can skip it to keep the game moving.",
    ok: false,
  };
}

function durationSecondsForEntryType(entryType: EntryType, settings: TurnTimerSettings): number {
  if (entryType === "drawing") {
    return settings.drawingSeconds;
  }

  if (entryType === "guess") {
    return settings.guessingSeconds;
  }

  return 0;
}
