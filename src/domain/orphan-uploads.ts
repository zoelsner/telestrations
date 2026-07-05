// A blob is a deletable orphan iff it is older than the min age AND not referenced
// by any entry. The min age must exceed the worst-case gap between minting an
// upload URL and creating the entry (seconds in practice); 1 hour is comfortably
// safe and never races a legitimate in-flight upload.
export const ORPHAN_UPLOAD_MIN_AGE_MS = 60 * 60 * 1000;

export type OrphanBlob<TId extends string> = {
  storageId: TId;
  creationTime: number;
};

export type SelectOrphanStorageIdsInput<TId extends string> = {
  now: number;
  minAgeMs: number;
  maxDeletions: number;
  blobs: ReadonlyArray<OrphanBlob<TId>>;
  referencedStorageIds: ReadonlySet<TId>;
};

/**
 * Pure selection of which `_storage` blobs the orphan sweep should delete: old
 * enough to rule out an in-flight upload, and not referenced by any entry.
 * Bounded by `maxDeletions` so a large backlog drains across successive runs.
 */
export function selectOrphanStorageIds<TId extends string>({
  now,
  minAgeMs,
  maxDeletions,
  blobs,
  referencedStorageIds,
}: SelectOrphanStorageIdsInput<TId>): TId[] {
  const out: TId[] = [];

  for (const blob of blobs) {
    if (out.length >= maxDeletions) break;
    if (now - blob.creationTime < minAgeMs) continue; // in-flight, keep
    if (referencedStorageIds.has(blob.storageId)) continue; // referenced, keep
    out.push(blob.storageId);
  }

  return out;
}
