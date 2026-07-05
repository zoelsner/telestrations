import { describe, expect, it } from "vitest";

import { HEARTBEAT_INTERVAL_MS, PRESENCE_TIMEOUT_MS, isPlayerDisconnected } from "./presence";

describe("isPlayerDisconnected", () => {
  it("is not disconnected when the gap is under the timeout", () => {
    expect(isPlayerDisconnected({ lastSeenAt: 99_000, now: 100_000 })).toBe(false);
  });

  it("is not disconnected exactly at the timeout boundary (strict >)", () => {
    expect(isPlayerDisconnected({ lastSeenAt: 100_000 - PRESENCE_TIMEOUT_MS, now: 100_000 })).toBe(
      false,
    );
  });

  it("is disconnected just over the timeout boundary", () => {
    expect(
      isPlayerDisconnected({ lastSeenAt: 100_000 - PRESENCE_TIMEOUT_MS - 1, now: 100_000 }),
    ).toBe(true);
  });

  it("respects an explicit timeoutMs override", () => {
    expect(isPlayerDisconnected({ lastSeenAt: 0, now: 5_000, timeoutMs: 4_000 })).toBe(true);
    expect(isPlayerDisconnected({ lastSeenAt: 0, now: 3_000, timeoutMs: 4_000 })).toBe(false);
  });

  it("keeps the heartbeat cadence comfortably inside the presence timeout", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(PRESENCE_TIMEOUT_MS);
  });
});
