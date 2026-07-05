import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep active rooms whose turn deadline has passed plus the grace period and
// auto-expire the stalled turn so a disconnected or AFK host cannot permanently
// deadlock the game.
crons.interval("expire stalled turns", { minutes: 1 }, internal.rooms.sweepExpiredTurns, {});

// Sweep rooms through their data lifecycle: archive finished (kept viewable) and
// abandoned rooms, then permanently purge archived rooms past retention so rooms,
// entries, and drawing blobs stop accumulating forever.
crons.interval("sweep room lifecycle", { hours: 1 }, internal.rooms.sweepRoomLifecycle, {});

export default crons;
