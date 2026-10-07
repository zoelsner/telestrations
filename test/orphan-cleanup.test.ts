/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";

import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import schema from "../convex/schema";
import { ORPHAN_UPLOAD_MIN_AGE_MS } from "../src/domain/orphan-uploads";
import { RATE_LIMIT_ROW_TTL_MS } from "../src/domain/rate-limit";

const modules = import.meta.glob("../convex/**/*.ts");
const now = 1_800_000_000_000;

function fixture(bytesRead?: number) {
  vi.useFakeTimers();
  vi.setSystemTime(now - ORPHAN_UPLOAD_MIN_AGE_MS - 1);
  return convexTest({
    schema,
    modules,
    transactionLimits: bytesRead === undefined ? true : { bytesRead },
  });
}

afterEach(() => vi.useRealTimers());

test("pages past protected legacy drawings before deleting a later orphan", async () => {
  const t = fixture();
  const protectedIds = await t.run(async (ctx) => {
    const roomId = await ctx.db.insert("rooms", {
      code: "TEST",
      status: "reveal",
      settings: {
        maxPlayers: 15,
        promptMode: "player-written",
        allowCustomPrompts: true,
        drawingSeconds: 90,
        guessingSeconds: 60,
      },
      currentTurn: 2,
      playerCount: 1,
      seed: "test",
      createdAt: now,
      updatedAt: now,
    });
    const authorPlayerId = await ctx.db.insert("players", {
      roomId,
      tokenHash: "test",
      displayName: "Test",
      order: 0,
      status: "connected",
      isHost: true,
      joinedAt: now,
      lastSeenAt: now,
    });
    const chainId = await ctx.db.insert("chains", {
      roomId,
      ownerPlayerId: authorPlayerId,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    const ids = [];
    for (let i = 0; i < 50; i++) {
      const storageId = await ctx.storage.store(new Blob(["drawing"], { type: "image/png" }));
      ids.push(storageId);
      await ctx.db.insert("entries", {
        roomId,
        chainId,
        authorPlayerId,
        turn: i,
        type: "drawing",
        createdAt: now,
        submittedAt: now,
        payload: {
          type: "drawing",
          drawing: {
            version: 1,
            canvas: { width: 960, height: 600 },
            background: { type: "solid", color: "#fff" },
            artifact: {
              storageId,
              mimeType: "image/png",
              width: 960,
              height: 600,
            },
          },
        },
      });
    }
    return ids;
  });
  vi.advanceTimersByTime(1);
  const orphan = await t.run((ctx) => ctx.storage.store(new Blob(["orphan"])));
  vi.setSystemTime(now);

  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get(orphan))).not.toBeNull();
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get(orphan))).toBeNull();
  for (const id of protectedIds) {
    expect(await t.run((ctx) => ctx.db.system.get(id))).not.toBeNull();
  }
}, 30_000);

test("bounds deletions and resumes after deleting the page containing its cursor", async () => {
  const t = fixture();
  await t.run(async (ctx) => {
    for (let i = 0; i < 120; i++) await ctx.storage.store(new Blob(["orphan"]));
  });
  vi.setSystemTime(now);
  for (const remaining of [70, 20, 0]) {
    await t.mutation(internal.rooms.sweepOrphanedUploads, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).length),
    ).toBe(remaining);
  }
  // A completed scan must wrap around to uploads created since the last pass.
  vi.setSystemTime(now + 1);
  const later = await t.run((ctx) => ctx.storage.store(new Blob(["later"])));
  vi.advanceTimersByTime(ORPHAN_UPLOAD_MIN_AGE_MS);
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get(later))).toBeNull();
});

test("keeps fresh uploads and prunes only 50 expired rate-limit rows per run", async () => {
  const t = fixture();
  vi.setSystemTime(now);
  const fresh = await t.run(async (ctx) => {
    for (let i = 0; i < 70; i++) {
      await ctx.db.insert("rateLimits", {
        key: `old:${i}`,
        windowStartMs: now - RATE_LIMIT_ROW_TTL_MS - 1,
        count: 1,
      });
    }
    await ctx.db.insert("rateLimits", {
      key: "boundary",
      windowStartMs: now - RATE_LIMIT_ROW_TTL_MS,
      count: 1,
    });
    return ctx.storage.store(new Blob(["fresh"]));
  });
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(async (ctx) => (await ctx.db.query("rateLimits").collect()).length)).toBe(21);
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(
    await t.run(async (ctx) => (await ctx.db.query("rateLimits").collect()).map((r) => r.key)),
  ).toEqual(["boundary"]);
  await t.mutation(internal.rooms.deleteOrphanedUpload, { storageId: fresh });
  expect(await t.run((ctx) => ctx.db.system.get(fresh))).not.toBeNull();
});

async function insertReference(ctx: MutationCtx, storageId: Id<"_storage">, points = 0) {
  const roomId = await ctx.db.insert("rooms", {
    code: "TEST",
    status: "reveal",
    settings: {
      maxPlayers: 15,
      promptMode: "player-written",
      allowCustomPrompts: true,
      drawingSeconds: 90,
      guessingSeconds: 60,
    },
    currentTurn: 2,
    playerCount: 1,
    seed: "test",
    createdAt: now,
    updatedAt: now,
  });
  const authorPlayerId = await ctx.db.insert("players", {
    roomId,
    tokenHash: "test",
    displayName: "Test",
    order: 0,
    status: "connected",
    isHost: true,
    joinedAt: now,
    lastSeenAt: now,
  });
  const chainId = await ctx.db.insert("chains", {
    roomId,
    ownerPlayerId: authorPlayerId,
    order: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.insert("entries", {
    roomId,
    chainId,
    authorPlayerId,
    turn: 1,
    type: "drawing",
    createdAt: now,
    submittedAt: now,
    payload: {
      type: "drawing",
      drawing: {
        version: 1,
        canvas: { width: 960, height: 600 },
        background: { type: "solid", color: "#fff" },
        strokes: [
          {
            id: "stroke",
            color: "#000",
            width: 2,
            points: Array.from({ length: points }, (_, i) => ({ x: i % 960, y: i % 600 })),
          },
        ],
        artifact: { storageId, mimeType: "image/png", width: 960, height: 600 },
      },
    },
  });
}

test("rechecks live references after scheduling and tolerates an already deleted blob", async () => {
  const t = fixture();
  const blob = await t.run((ctx) => ctx.storage.store(new Blob(["drawing"])));
  const missing = await t.run((ctx) => ctx.storage.store(new Blob(["gone"])));
  vi.setSystemTime(now);
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.run(async (ctx) => {
    const entryId = await insertReference(ctx, blob);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("Fixture entry missing");
    const { roomId, chainId, authorPlayerId, createdAt, submittedAt } = entry;
    const base = { roomId, chainId, authorPlayerId, createdAt, submittedAt, turn: 0 };
    for (const type of ["prompt", "guess"] as const) {
      await ctx.db.insert("entries", { ...base, type, payload: { type, text: "Fixture" } });
    }
    await ctx.db.insert("entries", {
      ...base,
      type: "drawing",
      payload: { type: "drawing", skipped: true, reason: "Skipped" },
    });
    await ctx.storage.delete(missing);
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get(blob))).not.toBeNull();
  await t.mutation(internal.rooms.deleteOrphanedUpload, { storageId: missing });
});

test("cleans up within a read budget smaller than retained stroke history", async () => {
  const t = fixture(256 * 1024);
  const blob = await t.run((ctx) => ctx.storage.store(new Blob(["drawing"])));
  const orphan = await t.run((ctx) => ctx.storage.store(new Blob(["orphan"])));
  for (let i = 0; i < 6; i++) {
    await t.run((ctx) => insertReference(ctx, blob, 4000));
  }
  // Six ~70 KiB entries exceed this transaction's 256 KiB read budget.
  // Assert the fixture would reject the previous unbounded history read.
  await expect(t.run((ctx) => ctx.db.query("entries").collect())).rejects.toThrow();
  vi.setSystemTime(now);
  await t.mutation(internal.rooms.sweepOrphanedUploads, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get(blob))).not.toBeNull();
  expect(await t.run((ctx) => ctx.db.system.get(orphan))).toBeNull();
}, 30_000);
