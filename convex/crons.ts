import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep active rooms whose turn deadline has passed plus the grace period and
// auto-expire the stalled turn so a disconnected or AFK host cannot permanently
// deadlock the game.
crons.interval("expire stalled turns", { minutes: 1 }, internal.rooms.sweepExpiredTurns, {});

export default crons;
