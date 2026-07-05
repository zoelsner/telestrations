import { describe, expect, it } from "vitest";

import { RATE_LIMITS, evaluateRateLimit } from "./rate-limit";

describe("evaluateRateLimit", () => {
  const now = 1_000_000_000_000;
  const windowMs = 60_000;
  const limit = 5;

  it("allows a never-seen key and starts a fresh window", () => {
    expect(evaluateRateLimit({ now, windowMs, limit, state: null })).toEqual({
      allowed: true,
      next: { windowStartMs: now, count: 1 },
    });
  });

  it("allows and increments while under the limit within the window", () => {
    expect(
      evaluateRateLimit({
        now,
        windowMs,
        limit,
        state: { windowStartMs: now - 1_000, count: 2 },
      }),
    ).toEqual({
      allowed: true,
      next: { windowStartMs: now - 1_000, count: 3 },
    });
  });

  it("blocks at the limit within the window", () => {
    const windowStartMs = now - 1_000;
    expect(
      evaluateRateLimit({
        now,
        windowMs,
        limit,
        state: { windowStartMs, count: limit },
      }),
    ).toEqual({
      allowed: false,
      retryAfterMs: windowStartMs + windowMs - now,
    });
  });

  it("resets the window once it has elapsed", () => {
    expect(
      evaluateRateLimit({
        now,
        windowMs,
        limit,
        state: { windowStartMs: now - windowMs, count: limit },
      }),
    ).toEqual({
      allowed: true,
      next: { windowStartMs: now, count: 1 },
    });
  });
});

describe("RATE_LIMITS", () => {
  it("keys createRoom on a global scope so a fresh per-call token cannot bypass it", () => {
    expect(RATE_LIMITS.createRoom.scope).toBe("global");
  });

  it("keys joinRoom and drawingUploadUrl on a per-token scope", () => {
    expect(RATE_LIMITS.joinRoom.scope).toBe("token");
    expect(RATE_LIMITS.drawingUploadUrl.scope).toBe("token");
  });
});
