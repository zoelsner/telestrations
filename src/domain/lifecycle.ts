export type LifecycleRoomStatus = "setup" | "lobby" | "active" | "reveal" | "archived";

/**
 * How long a finished (reveal) room stays live before it is archived. Archiving
 * only flips the room's status and stamps `archivedAt`; the reveal stays viewable
 * because `getReveal` serves both "reveal" and "archived" rooms.
 */
export const ARCHIVE_AFTER_REVEAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * How long an unfinished room (setup/lobby/active) may sit untouched before it is
 * treated as abandoned and archived. This is a safety net beneath the per-turn
 * expiry sweep: it catches dead lobbies and timers-off active rooms that stalled
 * and therefore never advance to reveal on their own.
 */
export const ARCHIVE_AFTER_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * How long an archived room is retained before it and all of its dependent docs
 * (entries, assignments, chains, players) and drawing blobs are permanently
 * deleted, freeing its room code for reuse.
 */
export const PURGE_AFTER_ARCHIVE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type RoomLifecycleInput = {
  archivedAt: number | undefined;
  now: number;
  revealedAt: number | undefined;
  status: LifecycleRoomStatus;
  updatedAt: number;
};

export type RoomLifecycleAction = "keep" | "archive" | "purge";

/**
 * Decides what the data-lifecycle sweep should do with a single room given its
 * status and timestamps. Pure: the caller re-reads live state inside the per-room
 * mutation and re-checks this decision before archiving or purging, so a room that
 * changed since the sweep enumerated it is handled correctly.
 */
export function getRoomLifecycleAction(input: RoomLifecycleInput): RoomLifecycleAction {
  if (input.status === "archived") {
    // Fall back to updatedAt for legacy archived rooms written before archivedAt
    // was stamped, so they can still age out of retention.
    const archivedAt = input.archivedAt ?? input.updatedAt;
    return input.now - archivedAt >= PURGE_AFTER_ARCHIVE_MS ? "purge" : "keep";
  }

  if (input.status === "reveal") {
    // Fall back to updatedAt for reveal rooms written before revealedAt existed.
    const finishedAt = input.revealedAt ?? input.updatedAt;
    return input.now - finishedAt >= ARCHIVE_AFTER_REVEAL_MS ? "archive" : "keep";
  }

  // setup / lobby / active: abandoned-room safety net keyed off last activity.
  return input.now - input.updatedAt >= ARCHIVE_AFTER_IDLE_MS ? "archive" : "keep";
}
