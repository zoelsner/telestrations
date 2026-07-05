import { describe, expect, it } from "vitest";

import {
  ARCHIVE_AFTER_IDLE_MS,
  ARCHIVE_AFTER_REVEAL_MS,
  PURGE_AFTER_ARCHIVE_MS,
  getRoomLifecycleAction,
} from "./lifecycle";

describe("getRoomLifecycleAction", () => {
  const now = 1_000_000_000_000;

  it("keeps a room that reached reveal within the archive window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: now - ARCHIVE_AFTER_REVEAL_MS + 1,
        status: "reveal",
        updatedAt: now - ARCHIVE_AFTER_REVEAL_MS + 1,
      }),
    ).toBe("keep");
  });

  it("archives a room whose reveal is older than the archive window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: now - ARCHIVE_AFTER_REVEAL_MS - 1,
        status: "reveal",
        updatedAt: now - ARCHIVE_AFTER_REVEAL_MS - 1,
      }),
    ).toBe("archive");
  });

  it("archives at exactly the reveal archive boundary", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: now - ARCHIVE_AFTER_REVEAL_MS,
        status: "reveal",
        updatedAt: now - ARCHIVE_AFTER_REVEAL_MS,
      }),
    ).toBe("archive");
  });

  it("falls back to updatedAt when a reveal room has no revealedAt stamp", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "reveal",
        updatedAt: now - ARCHIVE_AFTER_REVEAL_MS - 1,
      }),
    ).toBe("archive");
  });

  it("archives an abandoned lobby past the idle window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "lobby",
        updatedAt: now - ARCHIVE_AFTER_IDLE_MS - 1,
      }),
    ).toBe("archive");
  });

  it("archives a stalled active room past the idle window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "active",
        updatedAt: now - ARCHIVE_AFTER_IDLE_MS - 1,
      }),
    ).toBe("archive");
  });

  it("keeps an active room still inside the idle window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "active",
        updatedAt: now - ARCHIVE_AFTER_IDLE_MS + 1,
      }),
    ).toBe("keep");
  });

  it("keeps a setup room still inside the idle window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "setup",
        updatedAt: now - 1,
      }),
    ).toBe("keep");
  });

  it("keeps an archived room still inside the purge window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: now - PURGE_AFTER_ARCHIVE_MS + 1,
        now,
        revealedAt: now - PURGE_AFTER_ARCHIVE_MS,
        status: "archived",
        updatedAt: now - PURGE_AFTER_ARCHIVE_MS + 1,
      }),
    ).toBe("keep");
  });

  it("purges an archived room past the purge window", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: now - PURGE_AFTER_ARCHIVE_MS - 1,
        now,
        revealedAt: now - PURGE_AFTER_ARCHIVE_MS - 2,
        status: "archived",
        updatedAt: now - PURGE_AFTER_ARCHIVE_MS - 1,
      }),
    ).toBe("purge");
  });

  it("purges at exactly the purge boundary", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: now - PURGE_AFTER_ARCHIVE_MS,
        now,
        revealedAt: undefined,
        status: "archived",
        updatedAt: now - PURGE_AFTER_ARCHIVE_MS,
      }),
    ).toBe("purge");
  });

  it("falls back to updatedAt when an archived room has no archivedAt stamp", () => {
    expect(
      getRoomLifecycleAction({
        archivedAt: undefined,
        now,
        revealedAt: undefined,
        status: "archived",
        updatedAt: now - PURGE_AFTER_ARCHIVE_MS - 1,
      }),
    ).toBe("purge");
  });
});
