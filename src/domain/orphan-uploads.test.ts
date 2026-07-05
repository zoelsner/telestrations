import { describe, expect, it } from "vitest";

import { ORPHAN_UPLOAD_MIN_AGE_MS, selectOrphanStorageIds } from "./orphan-uploads";

describe("selectOrphanStorageIds", () => {
  const now = 1_000_000_000_000;

  it("selects an old, unreferenced blob", () => {
    expect(
      selectOrphanStorageIds({
        now,
        minAgeMs: ORPHAN_UPLOAD_MIN_AGE_MS,
        maxDeletions: 50,
        blobs: [{ storageId: "a", creationTime: now - ORPHAN_UPLOAD_MIN_AGE_MS - 1 }],
        referencedStorageIds: new Set<string>(),
      }),
    ).toEqual(["a"]);
  });

  it("excludes a blob younger than the min age (in-flight upload safety)", () => {
    expect(
      selectOrphanStorageIds({
        now,
        minAgeMs: ORPHAN_UPLOAD_MIN_AGE_MS,
        maxDeletions: 50,
        blobs: [{ storageId: "a", creationTime: now - 1_000 }],
        referencedStorageIds: new Set<string>(),
      }),
    ).toEqual([]);
  });

  it("excludes a referenced blob even if old", () => {
    expect(
      selectOrphanStorageIds({
        now,
        minAgeMs: ORPHAN_UPLOAD_MIN_AGE_MS,
        maxDeletions: 50,
        blobs: [{ storageId: "a", creationTime: now - ORPHAN_UPLOAD_MIN_AGE_MS - 1 }],
        referencedStorageIds: new Set(["a"]),
      }),
    ).toEqual([]);
  });

  it("respects maxDeletions, returning at most N", () => {
    const blobs = Array.from({ length: 5 }, (_, index) => ({
      storageId: `blob-${index}`,
      creationTime: now - ORPHAN_UPLOAD_MIN_AGE_MS - 1,
    }));

    expect(
      selectOrphanStorageIds({
        now,
        minAgeMs: ORPHAN_UPLOAD_MIN_AGE_MS,
        maxDeletions: 2,
        blobs,
        referencedStorageIds: new Set<string>(),
      }),
    ).toEqual(["blob-0", "blob-1"]);
  });
});
