import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roomStatus = v.union(
  v.literal("setup"),
  v.literal("lobby"),
  v.literal("active"),
  v.literal("reveal"),
  v.literal("archived"),
);

const promptMode = v.union(v.literal("player-written"), v.literal("safe-pack"), v.literal("mixed"));

const playerStatus = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("removed"),
);

const entryType = v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess"));

const assignmentStatus = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("skipped"),
  v.literal("expired"),
);

const roomSettings = v.object({
  maxPlayers: v.number(),
  promptMode,
  promptPackId: v.optional(v.string()),
  allowCustomPrompts: v.boolean(),
  drawingSeconds: v.number(),
  guessingSeconds: v.number(),
});

const drawingPayloadV1 = v.object({
  version: v.literal(1),
  canvas: v.object({
    width: v.number(),
    height: v.number(),
  }),
  background: v.object({
    type: v.literal("solid"),
    color: v.string(),
  }),
  strokes: v.optional(
    v.array(
      v.object({
        id: v.string(),
        color: v.string(),
        width: v.number(),
        points: v.array(
          v.object({
            x: v.number(),
            y: v.number(),
            pressure: v.optional(v.number()),
            t: v.optional(v.number()),
          }),
        ),
        startedAt: v.optional(v.number()),
        endedAt: v.optional(v.number()),
      }),
    ),
  ),
  artifact: v.object({
    mimeType: v.literal("image/png"),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    byteSize: v.optional(v.number()),
  }),
});

const skippedDrawingPayload = v.object({
  type: v.literal("drawing"),
  skipped: v.literal(true),
  reason: v.string(),
});

const entryPayload = v.union(
  v.object({
    type: v.literal("prompt"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("guess"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("drawing"),
    drawing: drawingPayloadV1,
  }),
  skippedDrawingPayload,
);

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostPlayerId: v.optional(v.id("players")),
    status: roomStatus,
    settings: roomSettings,
    currentTurn: v.number(),
    currentEntryType: v.optional(entryType),
    currentTurnStartedAt: v.optional(v.number()),
    playerCount: v.number(),
    seed: v.string(),
    activeDeadlineAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    revealedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_active_state", ["status", "currentTurn"]),

  players: defineTable({
    roomId: v.id("rooms"),
    tokenHash: v.string(),
    displayName: v.string(),
    order: v.number(),
    status: playerStatus,
    isHost: v.boolean(),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
    disconnectedAt: v.optional(v.number()),
    removedAt: v.optional(v.number()),
    rejoinTokenHash: v.optional(v.string()),
    rejoinIssuedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_order", ["roomId", "order"])
    .index("by_room_token", ["roomId", "tokenHash"])
    .index("by_room_status", ["roomId", "status"]),

  chains: defineTable({
    roomId: v.id("rooms"),
    ownerPlayerId: v.id("players"),
    order: v.number(),
    currentEntryId: v.optional(v.id("entries")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_order", ["roomId", "order"])
    .index("by_owner", ["ownerPlayerId"]),

  entries: defineTable({
    roomId: v.id("rooms"),
    chainId: v.id("chains"),
    authorPlayerId: v.id("players"),
    turn: v.number(),
    type: entryType,
    payload: entryPayload,
    createdAt: v.number(),
    submittedAt: v.number(),
  })
    .index("by_room_turn", ["roomId", "turn"])
    .index("by_chain_turn", ["chainId", "turn"])
    .index("by_author_turn", ["authorPlayerId", "turn"]),

  assignments: defineTable({
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    chainId: v.id("chains"),
    turn: v.number(),
    entryType,
    status: assignmentStatus,
    previousEntryId: v.optional(v.id("entries")),
    submittedEntryId: v.optional(v.id("entries")),
    assignedAt: v.number(),
    dueAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    skippedAt: v.optional(v.number()),
    expiredAt: v.optional(v.number()),
  })
    .index("by_room_turn", ["roomId", "turn"])
    .index("by_room_status", ["roomId", "status"])
    .index("by_player_turn", ["playerId", "turn"])
    .index("by_player_status", ["playerId", "status"])
    .index("by_chain_turn", ["chainId", "turn"]),
});
