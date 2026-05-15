import { describe, expect, it } from "vitest";

import {
  generatePlayerToken,
  generateRoomCode,
  normalizeDisplayName,
  normalizeRoomCode,
  playerTokenStorageKey,
  validateDisplayName,
  validatePlayerToken,
  validateRoomCode,
} from "./room-join";

describe("room join domain helpers", () => {
  it("normalizes pasted room codes and links", () => {
    expect(normalizeRoomCode(" f7k2 ")).toBe("F7K2");
    expect(normalizeRoomCode("draw.team/room/f7-k2")).toBe("F7K2");
    expect(normalizeRoomCode("https://draw.team/room/f7k2?from=slack")).toBe("F7K2");
  });

  it("accepts only short unambiguous room codes", () => {
    expect(validateRoomCode("F7K2")).toEqual({ ok: true, value: "F7K2" });
    expect(validateRoomCode("O0I1")).toEqual({
      ok: false,
      reason: "Room code must be 4 characters using A-Z and 2-9 without I, O, 1, or 0.",
    });
  });

  it("generates deterministic codes from an injected random index function", () => {
    const nextIndexes = [0, 1, 2, 3];
    const nextIndex = (max: number) => {
      const value = nextIndexes.shift();
      if (value === undefined) {
        throw new Error("unexpected random call");
      }
      expect(value).toBeLessThan(max);
      return value;
    };

    expect(generateRoomCode(nextIndex)).toBe("ABCD");
  });

  it("normalizes display names for storage and comparison", () => {
    expect(normalizeDisplayName("  Maya   Chen  ")).toBe("Maya Chen");
  });

  it("validates display names", () => {
    expect(validateDisplayName("  Lee  ")).toEqual({ ok: true, value: "Lee" });
    expect(validateDisplayName("")).toEqual({
      ok: false,
      reason: "Enter a display name.",
    });
    expect(validateDisplayName("A")).toEqual({
      ok: false,
      reason: "Display name must be at least 2 characters.",
    });
    expect(validateDisplayName("x".repeat(33))).toEqual({
      ok: false,
      reason: "Display name must be 32 characters or fewer.",
    });
    expect(validateDisplayName("Maya\nChen")).toEqual({
      ok: false,
      reason: "Display name cannot include control characters.",
    });
  });

  it("scopes player token storage keys by normalized room code", () => {
    expect(playerTokenStorageKey(" f7-k2 ")).toBe("telestrations:room:F7K2:player-token");
  });

  it("generates deterministic url-safe player tokens from injected bytes", () => {
    let nextByteValue = 0;
    const nextByte = () => {
      const value = nextByteValue;
      nextByteValue += 1;
      return value;
    };

    expect(generatePlayerToken(nextByte)).toBe(
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    );
  });

  it("accepts url-safe random player tokens", () => {
    expect(validatePlayerToken("abcDEF123_-xyz")).toEqual({
      ok: true,
      value: "abcDEF123_-xyz",
    });
    expect(validatePlayerToken("abc def")).toEqual({
      ok: false,
      reason: "Player token is invalid.",
    });
  });
});
