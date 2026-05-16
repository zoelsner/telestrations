import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { MAX_PLAYERS_PER_ROOM } from "../src/domain/game-state";
import {
  buildTurnAssignments,
  isTurnComplete,
  nextPhaseAfterCompletedTurn,
} from "../src/domain/rotation";
import {
  generateRoomCode,
  validateDisplayName,
  validatePlayerToken,
  validateRoomCode,
} from "../src/domain/room-join";
import { getStartGameGate } from "../src/domain/start-game";
import { prepareEntrySubmission } from "../src/domain/submission";

const roomResult = v.object({
  roomId: v.id("rooms"),
  playerId: v.id("players"),
  code: v.string(),
  sharePath: v.string(),
  isHost: v.boolean(),
});

const startGameResult = v.object({
  roomId: v.id("rooms"),
  code: v.string(),
  currentTurn: v.number(),
  currentEntryType: v.literal("prompt"),
  chainCount: v.number(),
  assignmentCount: v.number(),
});

const drawingPayloadInput = v.object({
  version: v.literal(1),
  canvas: v.object({
    width: v.number(),
    height: v.number(),
  }),
  background: v.object({
    type: v.literal("solid"),
    color: v.string(),
  }),
  strokes: v.array(
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
  artifact: v.object({
    mimeType: v.literal("image/png"),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    byteSize: v.optional(v.number()),
  }),
});

const entrySubmissionInput = v.union(
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
    drawing: drawingPayloadInput,
  }),
);

const submitEntryResult = v.object({
  roomId: v.id("rooms"),
  advanced: v.boolean(),
  assignmentId: v.id("assignments"),
  chainId: v.id("chains"),
  currentEntryType: v.optional(
    v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
  ),
  currentTurn: v.number(),
  entryId: v.id("entries"),
  roomStatus: v.union(v.literal("active"), v.literal("reveal")),
  turn: v.number(),
  type: v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
});

const activeTaskPreviousEntryResult = v.union(
  v.object({
    kind: v.literal("text"),
    label: v.union(v.literal("Previous prompt"), v.literal("Previous guess")),
    turn: v.number(),
    value: v.string(),
  }),
  v.object({
    imageUrl: v.string(),
    kind: v.literal("drawing"),
    label: v.literal("Previous drawing"),
    turn: v.number(),
  }),
);

const activeTaskResult = v.union(
  v.null(),
  v.object({
    assignment: v.union(
      v.null(),
      v.object({
        id: v.id("assignments"),
        entryType: v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
        previousEntry: v.optional(activeTaskPreviousEntryResult),
        status: v.union(
          v.literal("pending"),
          v.literal("submitted"),
          v.literal("skipped"),
          v.literal("expired"),
        ),
        submittedEntryId: v.optional(v.id("entries")),
        turn: v.number(),
      }),
    ),
    currentPlayer: v.union(
      v.null(),
      v.object({
        id: v.id("players"),
        displayName: v.string(),
        isHost: v.boolean(),
        status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("removed")),
      }),
    ),
    room: v.object({
      code: v.string(),
      currentEntryType: v.optional(
        v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
      ),
      currentTurn: v.number(),
      id: v.id("rooms"),
      status: v.union(
        v.literal("setup"),
        v.literal("lobby"),
        v.literal("active"),
        v.literal("reveal"),
        v.literal("archived"),
      ),
    }),
    round: v.object({
      pendingCount: v.number(),
      submittedCount: v.number(),
      totalCount: v.number(),
    }),
  }),
);

type RoomLookupCtx = {
  db: QueryCtx["db"] | MutationCtx["db"];
};

export const createRoom = mutation({
  args: {
    hostName: v.string(),
    playerToken: v.string(),
  },
  returns: roomResult,
  handler: async (ctx, args) => {
    const hostName = requireValidDisplayName(args.hostName);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const code = await createUniqueRoomCode(ctx);

    const roomId = await ctx.db.insert("rooms", {
      code,
      status: "lobby",
      settings: {
        maxPlayers: MAX_PLAYERS_PER_ROOM,
        promptMode: "player-written",
        allowCustomPrompts: true,
        drawingSeconds: 90,
        guessingSeconds: 60,
      },
      currentTurn: 0,
      playerCount: 0,
      seed: `${code}-${now}`,
      createdAt: now,
      updatedAt: now,
    });

    const playerId = await ctx.db.insert("players", {
      roomId,
      tokenHash,
      displayName: hostName,
      order: 0,
      status: "connected",
      isHost: true,
      joinedAt: now,
      lastSeenAt: now,
    });

    await ctx.db.patch(roomId, {
      hostPlayerId: playerId,
      playerCount: 1,
      updatedAt: now,
    });

    return {
      roomId,
      playerId,
      code,
      sharePath: `/room/${code}`,
      isHost: true,
    };
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    displayName: v.string(),
    playerToken: v.string(),
  },
  returns: roomResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const displayName = requireValidDisplayName(args.displayName);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    if (room.status !== "lobby" && room.status !== "setup") {
      throw roomError("room_closed", "This room is no longer open for joining.");
    }

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room_token", (q) => q.eq("roomId", room._id).eq("tokenHash", tokenHash))
      .unique();

    if (existingPlayer) {
      if (existingPlayer.status === "removed") {
        throw roomError("player_removed", "This player slot was removed by the host.");
      }

      await ctx.db.patch(existingPlayer._id, {
        displayName,
        status: "connected",
        lastSeenAt: now,
      });

      return {
        roomId: room._id,
        playerId: existingPlayer._id,
        code: room.code,
        sharePath: `/room/${room.code}`,
        isHost: existingPlayer.isHost,
      };
    }

    if (room.playerCount >= room.settings.maxPlayers) {
      throw roomError("room_full", "This room is full.");
    }

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      tokenHash,
      displayName,
      order: room.playerCount,
      status: "connected",
      isHost: false,
      joinedAt: now,
      lastSeenAt: now,
    });

    await ctx.db.patch(room._id, {
      playerCount: room.playerCount + 1,
      updatedAt: now,
    });

    return {
      roomId: room._id,
      playerId,
      code: room.code,
      sharePath: `/room/${room.code}`,
      isHost: false,
    };
  },
});

export const getLobby = query({
  args: {
    code: v.string(),
    playerToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const codeResult = validateRoomCode(args.code);

    if (!codeResult.ok) {
      return null;
    }

    const room = await getRoomByCode(ctx, codeResult.value);

    if (!room) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room_order", (q) => q.eq("roomId", room._id))
      .collect();
    const tokenHash = args.playerToken ? await hashPlayerToken(args.playerToken) : null;
    const currentPlayer =
      tokenHash === null
        ? null
        : (players.find((player) => player.tokenHash === tokenHash) ?? null);

    return {
      room: {
        id: room._id,
        code: room.code,
        status: room.status,
        playerCount: room.playerCount,
        maxPlayers: room.settings.maxPlayers,
        currentTurn: room.currentTurn,
        isJoinable: room.status === "lobby" || room.status === "setup",
      },
      players: players.map((player) => ({
        id: player._id,
        displayName: player.displayName,
        order: player.order,
        status: player.status,
        isHost: player.isHost,
        isCurrentPlayer: currentPlayer?._id === player._id,
      })),
      currentPlayer:
        currentPlayer === null
          ? null
          : {
              id: currentPlayer._id,
              isHost: currentPlayer.isHost,
              status: currentPlayer.status,
            },
    };
  },
});

export const getActiveTask = query({
  args: {
    code: v.string(),
    playerToken: v.string(),
  },
  returns: activeTaskResult,
  handler: async (ctx, args) => {
    const codeResult = validateRoomCode(args.code);

    if (!codeResult.ok) {
      return null;
    }

    const tokenHash = await requireValidTokenHash(args.playerToken);
    const room = await getRoomByCode(ctx, codeResult.value);

    if (!room) {
      return null;
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);
    const assignment =
      currentPlayer === null || currentPlayer.status === "removed"
        ? null
        : await getAssignmentByPlayerTurn(ctx, currentPlayer._id, room.currentTurn);
    const roundAssignments = await getAssignmentsByRoomTurn(ctx, room._id, room.currentTurn);
    const previousEntry =
      assignment === null ? undefined : await getPreviousEntryForAssignment(ctx, assignment);

    return {
      assignment:
        assignment === null
          ? null
          : {
              id: assignment._id,
              entryType: assignment.entryType,
              ...(previousEntry === undefined ? {} : { previousEntry }),
              status: assignment.status,
              ...(assignment.submittedEntryId === undefined
                ? {}
                : { submittedEntryId: assignment.submittedEntryId }),
              turn: assignment.turn,
            },
      currentPlayer:
        currentPlayer === null
          ? null
          : {
              id: currentPlayer._id,
              displayName: currentPlayer.displayName,
              isHost: currentPlayer.isHost,
              status: currentPlayer.status,
            },
      room: {
        code: room.code,
        ...(room.currentEntryType === undefined ? {} : { currentEntryType: room.currentEntryType }),
        currentTurn: room.currentTurn,
        id: room._id,
        status: room.status,
      },
      round: {
        pendingCount: roundAssignments.filter((assignment) => assignment.status === "pending")
          .length,
        submittedCount: roundAssignments.filter((assignment) => assignment.status === "submitted")
          .length,
        totalCount: roundAssignments.length,
      },
    };
  },
});

export const startGame = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
  },
  returns: startGameResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);
    const players = (await getPlayersByRoom(ctx, room._id)).filter(
      (player) => player.status !== "removed",
    );
    const existingChains = await ctx.db
      .query("chains")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const startGate = getStartGameGate({
      existingChainCount: existingChains.length,
      isHost: currentPlayer?.isHost === true,
      playerCount: players.length,
      roomStatus: room.status,
    });

    if (!startGate.ok) {
      throw roomError(startGate.code, startGate.message);
    }

    const chainRecords = [];

    for (const player of players) {
      const chainId = await ctx.db.insert("chains", {
        roomId: room._id,
        ownerPlayerId: player._id,
        order: player.order,
        createdAt: now,
        updatedAt: now,
      });

      chainRecords.push({
        id: chainId,
        order: player.order,
      });
    }

    const assignments = buildTurnAssignments({
      chains: chainRecords,
      players: players.map((player) => ({
        id: player._id,
        order: player.order,
      })),
      turn: 0,
    });
    const playerByOrder = new Map(players.map((player) => [player.order, player]));
    const chainByOrder = new Map(chainRecords.map((chain) => [chain.order, chain]));

    for (const assignment of assignments) {
      const player = requireOrderValue(playerByOrder, assignment.playerOrder, "player");
      const chain = requireOrderValue(chainByOrder, assignment.chainOrder, "chain");

      await ctx.db.insert("assignments", {
        roomId: room._id,
        playerId: player._id,
        chainId: chain.id,
        turn: assignment.turn,
        entryType: assignment.entryType,
        status: "pending",
        assignedAt: now,
      });
    }

    await ctx.db.patch(room._id, {
      status: "active",
      currentTurn: 0,
      currentEntryType: "prompt",
      startedAt: now,
      updatedAt: now,
    });

    return {
      roomId: room._id,
      code: room.code,
      currentTurn: 0,
      currentEntryType: "prompt" as const,
      chainCount: chainRecords.length,
      assignmentCount: assignments.length,
    };
  },
});

export const generateDrawingUploadUrl = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);

    if (!currentPlayer || currentPlayer.status === "removed") {
      throw roomError("player_not_found", "Player not found in this room.");
    }

    const assignment = await getAssignmentByPlayerTurn(ctx, currentPlayer._id, room.currentTurn);

    if (room.status !== "active" || room.currentEntryType !== "drawing") {
      throw roomError("room_not_active", "This room is not accepting drawing uploads.");
    }

    if (!assignment) {
      throw roomError("assignment_not_found", "No active assignment was found.");
    }

    if (
      assignment.entryType !== "drawing" ||
      assignment.status !== "pending" ||
      assignment.submittedEntryId
    ) {
      throw roomError("assignment_not_pending", "This drawing assignment is not pending.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const submitEntry = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
    payload: entrySubmissionInput,
  },
  returns: submitEntryResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);

    if (!currentPlayer || currentPlayer.status === "removed") {
      throw roomError("player_not_found", "Player not found in this room.");
    }

    const assignment = await getAssignmentByPlayerTurn(ctx, currentPlayer._id, room.currentTurn);
    const submissionAssignment =
      assignment === null
        ? null
        : {
            entryType: assignment.entryType,
            playerId: assignment.playerId,
            status: assignment.status,
            ...(assignment.submittedEntryId === undefined
              ? {}
              : { submittedEntryId: assignment.submittedEntryId }),
            turn: assignment.turn,
          };
    const preparedSubmission = prepareEntrySubmission({
      assignment: submissionAssignment,
      currentEntryType: room.currentEntryType,
      currentTurn: room.currentTurn,
      payload: args.payload,
      playerId: currentPlayer._id,
      roomStatus: room.status,
    });

    if (!preparedSubmission.ok) {
      throw roomError(preparedSubmission.code, preparedSubmission.message);
    }

    if (!assignment) {
      throw roomError("assignment_not_found", "No active assignment was found.");
    }

    const entryId = await ctx.db.insert("entries", {
      roomId: room._id,
      chainId: assignment.chainId,
      authorPlayerId: currentPlayer._id,
      turn: preparedSubmission.turn,
      type: preparedSubmission.entryType,
      payload: preparedSubmission.payload,
      createdAt: now,
      submittedAt: now,
    });

    await ctx.db.patch(assignment._id, {
      status: "submitted",
      submittedEntryId: entryId,
      submittedAt: now,
    });

    await ctx.db.patch(assignment.chainId, {
      currentEntryId: entryId,
      updatedAt: now,
    });

    await ctx.db.patch(room._id, {
      updatedAt: now,
    });
    const advancement = await advanceRoomAfterTurnIfReady(ctx, room, now);

    return {
      roomId: room._id,
      advanced: advancement.advanced,
      assignmentId: assignment._id,
      chainId: assignment.chainId,
      ...(advancement.currentEntryType === undefined
        ? {}
        : { currentEntryType: advancement.currentEntryType }),
      currentTurn: advancement.currentTurn,
      entryId,
      roomStatus: advancement.roomStatus,
      turn: preparedSubmission.turn,
      type: preparedSubmission.entryType,
    };
  },
});

async function advanceRoomAfterTurnIfReady(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  now: number,
): Promise<{
  advanced: boolean;
  currentEntryType?: "prompt" | "drawing" | "guess";
  currentTurn: number;
  roomStatus: "active" | "reveal";
}> {
  const chains = await getChainsByRoom(ctx, room._id);
  const currentAssignments = await getAssignmentsByRoomTurn(ctx, room._id, room.currentTurn);

  if (
    !isTurnComplete({
      assignments: currentAssignments.map((assignment) => ({
        status: assignment.status,
        ...(assignment.submittedEntryId === undefined
          ? {}
          : { submittedEntryId: assignment.submittedEntryId }),
      })),
      expectedAssignmentCount: chains.length,
    })
  ) {
    return {
      advanced: false,
      ...(room.currentEntryType === undefined ? {} : { currentEntryType: room.currentEntryType }),
      currentTurn: room.currentTurn,
      roomStatus: "active",
    };
  }

  const nextPhase = nextPhaseAfterCompletedTurn({
    completedTurn: room.currentTurn,
    playerCount: chains.length,
  });

  if (nextPhase.status === "reveal") {
    await ctx.db.patch(room._id, {
      status: "reveal",
      revealedAt: now,
      updatedAt: now,
    });

    return {
      advanced: true,
      currentTurn: room.currentTurn,
      roomStatus: "reveal",
    };
  }

  const existingNextAssignments = await getAssignmentsByRoomTurn(ctx, room._id, nextPhase.turn);

  if (existingNextAssignments.length === 0) {
    const players = (await getPlayersByRoom(ctx, room._id)).filter(
      (player) => player.status !== "removed",
    );
    const playerByOrder = new Map(players.map((player) => [player.order, player]));
    const chainByOrder = new Map(chains.map((chain) => [chain.order, chain]));
    const nextAssignments = buildTurnAssignments({
      chains: chains.map((chain) => ({
        id: chain._id,
        order: chain.order,
      })),
      players: players.map((player) => ({
        id: player._id,
        order: player.order,
      })),
      turn: nextPhase.turn,
    });

    for (const nextAssignment of nextAssignments) {
      const player = requireOrderValue(playerByOrder, nextAssignment.playerOrder, "player");
      const chain = requireOrderValue(chainByOrder, nextAssignment.chainOrder, "chain");

      if (!chain.currentEntryId) {
        throw roomError(
          "invalid_turn_advancement",
          `Missing previous entry for chain order ${chain.order}.`,
        );
      }

      await ctx.db.insert("assignments", {
        roomId: room._id,
        playerId: player._id,
        chainId: chain._id,
        turn: nextAssignment.turn,
        entryType: nextAssignment.entryType,
        status: "pending",
        previousEntryId: chain.currentEntryId,
        assignedAt: now,
      });
    }
  } else if (existingNextAssignments.length !== chains.length) {
    throw roomError("invalid_turn_advancement", "Next turn assignments are incomplete.");
  }

  await ctx.db.patch(room._id, {
    currentTurn: nextPhase.turn,
    currentEntryType: nextPhase.entryType,
    updatedAt: now,
  });

  return {
    advanced: true,
    currentEntryType: nextPhase.entryType,
    currentTurn: nextPhase.turn,
    roomStatus: "active",
  };
}

async function createUniqueRoomCode(ctx: RoomLookupCtx) {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const code = generateRoomCode(randomIndex);
    const existingRoom = await getRoomByCode(ctx, code);

    if (!existingRoom) {
      return code;
    }
  }

  throw roomError("room_code_unavailable", "Could not allocate a room code.");
}

async function getRoomByCode(ctx: RoomLookupCtx, code: string): Promise<Doc<"rooms"> | null> {
  return await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
}

async function getPlayersByRoom(ctx: RoomLookupCtx, roomId: Doc<"rooms">["_id"]) {
  return await ctx.db
    .query("players")
    .withIndex("by_room_order", (q) => q.eq("roomId", roomId))
    .collect();
}

async function getChainsByRoom(ctx: RoomLookupCtx, roomId: Doc<"rooms">["_id"]) {
  return await ctx.db
    .query("chains")
    .withIndex("by_room_order", (q) => q.eq("roomId", roomId))
    .collect();
}

async function getPlayerByTokenHash(
  ctx: RoomLookupCtx,
  roomId: Doc<"rooms">["_id"],
  tokenHash: string,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_room_token", (q) => q.eq("roomId", roomId).eq("tokenHash", tokenHash))
    .unique();
}

async function getAssignmentsByRoomTurn(
  ctx: RoomLookupCtx,
  roomId: Doc<"rooms">["_id"],
  turn: number,
) {
  return await ctx.db
    .query("assignments")
    .withIndex("by_room_turn", (q) => q.eq("roomId", roomId).eq("turn", turn))
    .collect();
}

async function getPreviousEntryForAssignment(
  ctx: QueryCtx,
  assignment: Doc<"assignments">,
): Promise<
  | {
      kind: "text";
      label: "Previous prompt" | "Previous guess";
      turn: number;
      value: string;
    }
  | {
      imageUrl: string;
      kind: "drawing";
      label: "Previous drawing";
      turn: number;
    }
  | undefined
> {
  if (assignment.previousEntryId === undefined) {
    return undefined;
  }

  const previousEntry = await ctx.db.get(assignment.previousEntryId);

  if (!previousEntry) {
    return undefined;
  }

  if (previousEntry.payload.type === "drawing") {
    const imageUrl = await ctx.storage.getUrl(previousEntry.payload.drawing.artifact.storageId);

    if (imageUrl === null) {
      return undefined;
    }

    return {
      imageUrl,
      kind: "drawing",
      label: "Previous drawing",
      turn: previousEntry.turn,
    };
  }

  return {
    kind: "text",
    label: previousEntry.payload.type === "prompt" ? "Previous prompt" : "Previous guess",
    turn: previousEntry.turn,
    value: previousEntry.payload.text,
  };
}

async function getAssignmentByPlayerTurn(
  ctx: RoomLookupCtx,
  playerId: Doc<"players">["_id"],
  turn: number,
) {
  return await ctx.db
    .query("assignments")
    .withIndex("by_player_turn", (q) => q.eq("playerId", playerId).eq("turn", turn))
    .unique();
}

function requireOrderValue<TValue>(
  valuesByOrder: Map<number, TValue>,
  order: number,
  label: string,
) {
  const value = valuesByOrder.get(order);

  if (!value) {
    throw roomError("invalid_rotation", `Missing ${label} order ${order}.`);
  }

  return value;
}

function requireValidRoomCode(input: string) {
  const result = validateRoomCode(input);

  if (!result.ok) {
    throw roomError("invalid_room_code", result.reason);
  }

  return result.value;
}

function requireValidDisplayName(input: string) {
  const result = validateDisplayName(input);

  if (!result.ok) {
    throw roomError("invalid_display_name", result.reason);
  }

  return result.value;
}

async function requireValidTokenHash(input: string) {
  const result = validatePlayerToken(input);

  if (!result.ok) {
    throw roomError("invalid_player_token", result.reason);
  }

  return await hashPlayerToken(result.value);
}

async function hashPlayerToken(playerToken: string) {
  const bytes = new TextEncoder().encode(playerToken);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomIndex(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

function roomError(code: string, message: string) {
  return new ConvexError({ code, message });
}
