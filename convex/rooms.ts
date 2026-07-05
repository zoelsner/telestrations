import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { MAX_PLAYERS_PER_ROOM } from "../src/domain/game-state";
import { getRoomLifecycleAction } from "../src/domain/lifecycle";
import {
  buildTurnAssignments,
  isTurnComplete,
  nextPhaseAfterCompletedTurn,
} from "../src/domain/rotation";
import {
  getPromptPack,
  getPromptPackOptions,
  selectPackPrompt,
  validatePromptPackId,
  type PromptPackId,
} from "../src/domain/prompt-packs";
import {
  TURN_EXPIRY_GRACE_MS,
  getSkipAssignmentGate,
  getTurnExpirySweep,
} from "../src/domain/recovery";
import { getClaimSeatGate, getIssueRejoinLinkGate } from "../src/domain/rejoin";
import { getReclaimSeatGate } from "../src/domain/seat-reclaim";
import {
  PLAYER_TOKEN_BYTE_LENGTH,
  generatePlayerToken,
  generateRoomCode,
  validateDisplayName,
  validatePlayerToken,
  validateRoomCode,
} from "../src/domain/room-join";
import { getStartGameGate } from "../src/domain/start-game";
import { prepareEntrySubmission } from "../src/domain/submission";
import { getTurnDeadline, getTurnSubmissionGate, validateTimerSeconds } from "../src/domain/timer";

const roomResult = v.object({
  roomId: v.id("rooms"),
  playerId: v.id("players"),
  code: v.string(),
  sharePath: v.string(),
  isHost: v.boolean(),
});

const rejoinLinkResult = v.object({
  rejoinSecret: v.string(),
  targetPlayerId: v.id("players"),
});

const startGameResult = v.object({
  activeDeadlineAt: v.optional(v.number()),
  roomId: v.id("rooms"),
  code: v.string(),
  currentTurnStartedAt: v.number(),
  currentTurn: v.number(),
  currentEntryType: v.union(v.literal("prompt"), v.literal("drawing")),
  chainCount: v.number(),
  assignmentCount: v.number(),
});

const updateTimerSettingsResult = v.object({
  code: v.string(),
  drawingSeconds: v.number(),
  guessingSeconds: v.number(),
  roomId: v.id("rooms"),
});

const updatePromptSettingsResult = v.object({
  allowCustomPrompts: v.boolean(),
  code: v.string(),
  promptMode: v.union(v.literal("player-written"), v.literal("safe-pack"), v.literal("mixed")),
  promptPackId: v.optional(v.string()),
  roomId: v.id("rooms"),
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
  v.object({
    kind: v.literal("skipped"),
    label: v.union(
      v.literal("Previous prompt"),
      v.literal("Previous guess"),
      v.literal("Previous drawing"),
    ),
    turn: v.number(),
    value: v.string(),
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
      activeDeadlineAt: v.optional(v.number()),
      code: v.string(),
      currentEntryType: v.optional(
        v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
      ),
      currentTurn: v.number(),
      currentTurnStartedAt: v.optional(v.number()),
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
      completedCount: v.number(),
      pendingCount: v.number(),
      submittedCount: v.number(),
      skippedCount: v.number(),
      totalCount: v.number(),
      players: v.array(
        v.object({
          assignmentId: v.id("assignments"),
          assignmentStatus: v.union(
            v.literal("pending"),
            v.literal("submitted"),
            v.literal("skipped"),
            v.literal("expired"),
          ),
          displayName: v.string(),
          isCurrentPlayer: v.boolean(),
          isHost: v.boolean(),
          playerId: v.id("players"),
          playerStatus: v.union(
            v.literal("connected"),
            v.literal("disconnected"),
            v.literal("removed"),
          ),
        }),
      ),
    }),
  }),
);

const revealEntryResult = v.union(
  v.object({
    authorName: v.string(),
    id: v.id("entries"),
    text: v.string(),
    turn: v.number(),
    type: v.literal("prompt"),
  }),
  v.object({
    authorName: v.string(),
    id: v.id("entries"),
    imageUrl: v.optional(v.string()),
    turn: v.number(),
    type: v.literal("drawing"),
  }),
  v.object({
    authorName: v.string(),
    id: v.id("entries"),
    skipped: v.literal(true),
    text: v.string(),
    turn: v.number(),
    type: v.literal("drawing"),
  }),
  v.object({
    authorName: v.string(),
    id: v.id("entries"),
    text: v.string(),
    turn: v.number(),
    type: v.literal("guess"),
  }),
);

const revealResult = v.union(
  v.null(),
  v.object({
    chains: v.array(
      v.object({
        entries: v.array(revealEntryResult),
        id: v.id("chains"),
        order: v.number(),
        ownerName: v.string(),
      }),
    ),
    currentPlayer: v.union(
      v.null(),
      v.object({
        id: v.id("players"),
        displayName: v.string(),
        isHost: v.boolean(),
      }),
    ),
    players: v.array(
      v.object({
        displayName: v.string(),
        isHost: v.boolean(),
        order: v.number(),
      }),
    ),
    room: v.object({
      code: v.string(),
      currentTurn: v.number(),
      id: v.id("rooms"),
      revealedAt: v.optional(v.number()),
      settings: v.object({
        drawingSeconds: v.number(),
        guessingSeconds: v.number(),
        promptMode: v.union(
          v.literal("player-written"),
          v.literal("safe-pack"),
          v.literal("mixed"),
        ),
        promptPackLabel: v.optional(v.string()),
      }),
      startedAt: v.optional(v.number()),
      status: v.union(
        v.literal("setup"),
        v.literal("lobby"),
        v.literal("active"),
        v.literal("reveal"),
        v.literal("archived"),
      ),
    }),
  }),
);

const skipAssignmentResult = v.object({
  advanced: v.boolean(),
  assignmentId: v.id("assignments"),
  chainId: v.id("chains"),
  currentEntryType: v.optional(
    v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
  ),
  currentTurn: v.number(),
  entryId: v.id("entries"),
  roomId: v.id("rooms"),
  roomStatus: v.union(v.literal("active"), v.literal("reveal")),
  skippedPlayerId: v.id("players"),
  turn: v.number(),
  type: v.union(v.literal("prompt"), v.literal("drawing"), v.literal("guess")),
});

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
        promptPackId: "mixed",
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

export const issueRejoinLink = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
    targetPlayerId: v.id("players"),
  },
  returns: rejoinLinkResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const actor = await getPlayerByTokenHash(ctx, room._id, tokenHash);
    const target = await ctx.db.get(args.targetPlayerId);
    const gate = getIssueRejoinLinkGate({
      actor:
        actor === null
          ? null
          : {
              isHost: actor.isHost,
              status: actor.status,
            },
      target:
        target === null
          ? null
          : {
              isHost: target.isHost,
              roomId: target.roomId,
            },
      roomId: room._id,
      roomStatus: room.status,
    });

    if (!gate.ok) {
      throw roomError(gate.code, gate.message);
    }

    const rejoinSecret = createRejoinSecret();
    const rejoinTokenHash = await hashPlayerToken(rejoinSecret);

    await ctx.db.patch(args.targetPlayerId, {
      rejoinTokenHash,
      rejoinIssuedAt: now,
    });

    return {
      rejoinSecret,
      targetPlayerId: args.targetPlayerId,
    };
  },
});

export const claimSeat = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
    rejoinSecret: v.string(),
  },
  returns: roomResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const claimantTokenHash = await requireValidTokenHash(args.playerToken);
    const rejoinSecretHash = await hashPlayerToken(args.rejoinSecret);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const players = await getPlayersByRoom(ctx, room._id);
    const gate = getClaimSeatGate({
      claimantTokenHash,
      players: players.map((player) => ({
        id: player._id,
        isHost: player.isHost,
        ...(player.rejoinTokenHash === undefined
          ? {}
          : { rejoinTokenHash: player.rejoinTokenHash }),
        tokenHash: player.tokenHash,
      })),
      rejoinSecretHash,
      roomStatus: room.status,
    });

    if (!gate.ok) {
      throw roomError(gate.code, gate.message);
    }

    await rebindSeatToToken(ctx, gate.targetPlayerId, claimantTokenHash, now);

    const target = await ctx.db.get(gate.targetPlayerId);

    return {
      roomId: room._id,
      playerId: gate.targetPlayerId,
      code: room.code,
      sharePath: `/room/${room.code}`,
      isHost: target?.isHost ?? false,
    };
  },
});

export const heartbeat = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      return null;
    }

    const player = await getPlayerByTokenHash(ctx, room._id, tokenHash);

    if (!player || player.status === "removed") {
      return null;
    }

    await ctx.db.patch(player._id, { lastSeenAt: Date.now() });

    return null;
  },
});

export const reclaimSeat = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
    targetPlayerId: v.id("players"),
  },
  returns: roomResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const claimantTokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const players = await getPlayersByRoom(ctx, room._id);
    const gate = getReclaimSeatGate({
      claimantTokenHash,
      now,
      players: players.map((player) => ({
        id: player._id,
        isHost: player.isHost,
        lastSeenAt: player.lastSeenAt,
        status: player.status,
        tokenHash: player.tokenHash,
      })),
      roomStatus: room.status,
      targetPlayerId: args.targetPlayerId,
    });

    if (!gate.ok) {
      throw roomError(gate.code, gate.message);
    }

    await rebindSeatToToken(ctx, gate.targetPlayerId, claimantTokenHash, now);

    const target = await ctx.db.get(gate.targetPlayerId);

    return {
      roomId: room._id,
      playerId: gate.targetPlayerId,
      code: room.code,
      sharePath: `/room/${room.code}`,
      isHost: target?.isHost ?? false,
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
        ...(room.activeDeadlineAt === undefined ? {} : { activeDeadlineAt: room.activeDeadlineAt }),
        ...(room.currentTurnStartedAt === undefined
          ? {}
          : { currentTurnStartedAt: room.currentTurnStartedAt }),
        id: room._id,
        code: room.code,
        status: room.status,
        playerCount: room.playerCount,
        maxPlayers: room.settings.maxPlayers,
        currentTurn: room.currentTurn,
        isJoinable: room.status === "lobby" || room.status === "setup",
        settings: {
          allowCustomPrompts: room.settings.allowCustomPrompts,
          drawingSeconds: room.settings.drawingSeconds,
          guessingSeconds: room.settings.guessingSeconds,
          promptMode: room.settings.promptMode,
          ...(room.settings.promptPackId === undefined
            ? {}
            : { promptPackId: room.settings.promptPackId }),
          promptPackOptions: getPromptPackOptions(),
        },
      },
      players: players.map((player) => ({
        id: player._id,
        displayName: player.displayName,
        order: player.order,
        status: player.status,
        isHost: player.isHost,
        isCurrentPlayer: currentPlayer?._id === player._id,
        lastSeenAt: player.lastSeenAt,
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
    const roundPlayers = await getPlayersByRoom(ctx, room._id);
    const playersById = new Map(roundPlayers.map((player) => [player._id, player]));
    const previousEntry =
      assignment === null ? undefined : await getPreviousEntryForAssignment(ctx, assignment);
    const submittedCount = roundAssignments.filter(
      (roundAssignment) => roundAssignment.status === "submitted",
    ).length;
    const skippedCount = roundAssignments.filter(
      (roundAssignment) => roundAssignment.status === "skipped",
    ).length;

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
        ...(room.activeDeadlineAt === undefined ? {} : { activeDeadlineAt: room.activeDeadlineAt }),
        code: room.code,
        ...(room.currentEntryType === undefined ? {} : { currentEntryType: room.currentEntryType }),
        currentTurn: room.currentTurn,
        ...(room.currentTurnStartedAt === undefined
          ? {}
          : { currentTurnStartedAt: room.currentTurnStartedAt }),
        id: room._id,
        status: room.status,
      },
      round: {
        completedCount: submittedCount + skippedCount,
        pendingCount: roundAssignments.filter((assignment) => assignment.status === "pending")
          .length,
        players: roundAssignments
          .map((roundAssignment) => {
            const player = playersById.get(roundAssignment.playerId);

            if (!player) {
              return null;
            }

            return {
              assignmentId: roundAssignment._id,
              assignmentStatus: roundAssignment.status,
              displayName: player.displayName,
              isCurrentPlayer: currentPlayer?._id === player._id,
              isHost: player.isHost,
              playerId: player._id,
              playerStatus: player.status,
            };
          })
          .filter(isPresent),
        skippedCount,
        submittedCount,
        totalCount: roundAssignments.length,
      },
    };
  },
});

export const getReveal = query({
  args: {
    code: v.string(),
    playerToken: v.string(),
  },
  returns: revealResult,
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

    const players = await getPlayersByRoom(ctx, room._id);
    const playersById = new Map(players.map((player) => [player._id, player]));
    const currentPlayer =
      players.find((player) => player.tokenHash === tokenHash && player.status !== "removed") ??
      null;
    const promptPackResult = validatePromptPackId(room.settings.promptPackId);
    const chains =
      room.status === "reveal" || room.status === "archived"
        ? await getRevealChains(ctx, room._id, playersById)
        : [];

    return {
      chains,
      currentPlayer:
        currentPlayer === null
          ? null
          : {
              id: currentPlayer._id,
              displayName: currentPlayer.displayName,
              isHost: currentPlayer.isHost,
            },
      players: players
        .filter((player) => player.status !== "removed")
        .map((player) => ({
          displayName: player.displayName,
          isHost: player.isHost,
          order: player.order,
        })),
      room: {
        code: room.code,
        currentTurn: room.currentTurn,
        id: room._id,
        ...(room.revealedAt === undefined ? {} : { revealedAt: room.revealedAt }),
        settings: {
          drawingSeconds: room.settings.drawingSeconds,
          guessingSeconds: room.settings.guessingSeconds,
          promptMode: room.settings.promptMode,
          ...(promptPackResult.ok
            ? { promptPackLabel: getPromptPack(promptPackResult.value).label }
            : {}),
        },
        ...(room.startedAt === undefined ? {} : { startedAt: room.startedAt }),
        status: room.status,
      },
    };
  },
});

export const updateTimerSettings = mutation({
  args: {
    code: v.string(),
    drawingSeconds: v.number(),
    guessingSeconds: v.number(),
    playerToken: v.string(),
  },
  returns: updateTimerSettingsResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const drawingSeconds = requireValidTimerSeconds(args.drawingSeconds);
    const guessingSeconds = requireValidTimerSeconds(args.guessingSeconds);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);

    if (!currentPlayer || currentPlayer.status === "removed") {
      throw roomError("player_not_found", "Player not found in this room.");
    }

    if (!currentPlayer.isHost) {
      throw roomError("host_required", "Only the host can update timer settings.");
    }

    if (room.status !== "lobby" && room.status !== "setup") {
      throw roomError("room_not_configurable", "Timer settings can only be changed before start.");
    }

    await ctx.db.patch(room._id, {
      settings: {
        ...room.settings,
        drawingSeconds,
        guessingSeconds,
      },
      updatedAt: now,
    });

    return {
      code: room.code,
      drawingSeconds,
      guessingSeconds,
      roomId: room._id,
    };
  },
});

export const updatePromptSettings = mutation({
  args: {
    code: v.string(),
    playerToken: v.string(),
    promptMode: v.union(v.literal("player-written"), v.literal("safe-pack")),
    promptPackId: v.optional(v.string()),
  },
  returns: updatePromptSettingsResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const promptPackId =
      args.promptMode === "safe-pack" ? requireValidPromptPackId(args.promptPackId) : "mixed";
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);

    if (!currentPlayer || currentPlayer.status === "removed") {
      throw roomError("player_not_found", "Player not found in this room.");
    }

    if (!currentPlayer.isHost) {
      throw roomError("host_required", "Only the host can update prompt settings.");
    }

    if (room.status !== "lobby" && room.status !== "setup") {
      throw roomError("room_not_configurable", "Prompt settings can only be changed before start.");
    }

    const nextSettings = {
      ...room.settings,
      allowCustomPrompts: args.promptMode === "player-written",
      promptMode: args.promptMode,
      promptPackId,
    };

    await ctx.db.patch(room._id, {
      settings: nextSettings,
      updatedAt: now,
    });

    return {
      allowCustomPrompts: nextSettings.allowCustomPrompts,
      code: room.code,
      promptMode: nextSettings.promptMode,
      promptPackId,
      roomId: room._id,
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

    const playerByOrder = new Map(players.map((player) => [player.order, player]));
    const chainByOrder = new Map(chainRecords.map((chain) => [chain.order, chain]));
    const startTurn = room.settings.promptMode === "safe-pack" ? 1 : 0;
    const startEntryType = startTurn === 1 ? ("drawing" as const) : ("prompt" as const);
    const assignments = buildTurnAssignments({
      chains: chainRecords,
      players: players.map((player) => ({
        id: player._id,
        order: player.order,
      })),
      turn: startTurn,
    });
    const seededPromptEntryByChainId = new Map<Doc<"chains">["_id"], Doc<"entries">["_id"]>();

    if (room.settings.promptMode === "safe-pack") {
      const promptPackId = requireValidPromptPackId(room.settings.promptPackId);
      const usedPrompts: string[] = [];

      for (const chain of chainRecords) {
        const owner = requireOrderValue(playerByOrder, chain.order, "player");
        const prompt = selectPackPrompt({
          packId: promptPackId,
          playerOrder: owner.order,
          roomSeed: room.seed,
          usedPrompts,
        });
        usedPrompts.push(prompt);

        const entryId = await ctx.db.insert("entries", {
          roomId: room._id,
          chainId: chain.id,
          authorPlayerId: owner._id,
          turn: 0,
          type: "prompt",
          payload: {
            text: prompt,
            type: "prompt",
          },
          createdAt: now,
          submittedAt: now,
        });

        await ctx.db.patch(chain.id, {
          currentEntryId: entryId,
          updatedAt: now,
        });
        seededPromptEntryByChainId.set(chain.id, entryId);
      }
    }

    for (const assignment of assignments) {
      const player = requireOrderValue(playerByOrder, assignment.playerOrder, "player");
      const chain = requireOrderValue(chainByOrder, assignment.chainOrder, "chain");
      const previousEntryId =
        startTurn === 0 ? undefined : seededPromptEntryByChainId.get(chain.id);

      if (startTurn > 0 && previousEntryId === undefined) {
        throw roomError("invalid_start_prompt", `Missing seeded prompt for chain ${chain.order}.`);
      }

      await ctx.db.insert("assignments", {
        roomId: room._id,
        playerId: player._id,
        chainId: chain.id,
        turn: assignment.turn,
        entryType: assignment.entryType,
        status: "pending",
        ...(previousEntryId === undefined ? {} : { previousEntryId }),
        assignedAt: now,
      });
    }

    await ctx.db.patch(room._id, {
      status: "active",
      currentTurn: startTurn,
      currentEntryType: startEntryType,
      currentTurnStartedAt: now,
      activeDeadlineAt: getTurnDeadline({
        entryType: startEntryType,
        settings: room.settings,
        turnStartedAt: now,
      }),
      startedAt: now,
      updatedAt: now,
    });

    return {
      roomId: room._id,
      code: room.code,
      currentTurn: startTurn,
      currentTurnStartedAt: now,
      currentEntryType: startEntryType,
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

    assertTurnAcceptsSubmission(room.activeDeadlineAt, Date.now());

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
    assertTurnAcceptsSubmission(room.activeDeadlineAt, now);
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

export const skipAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    code: v.string(),
    playerToken: v.string(),
  },
  returns: skipAssignmentResult,
  handler: async (ctx, args) => {
    const code = requireValidRoomCode(args.code);
    const tokenHash = await requireValidTokenHash(args.playerToken);
    const now = Date.now();
    const room = await getRoomByCode(ctx, code);

    if (!room) {
      throw roomError("room_not_found", "Room not found.");
    }

    const currentPlayer = await getPlayerByTokenHash(ctx, room._id, tokenHash);
    const assignment = await ctx.db.get(args.assignmentId);
    const skipGate = getSkipAssignmentGate({
      actor:
        currentPlayer === null
          ? null
          : {
              isHost: currentPlayer.isHost,
              status: currentPlayer.status,
            },
      assignment:
        assignment === null
          ? null
          : {
              roomId: assignment.roomId,
              status: assignment.status,
              turn: assignment.turn,
            },
      currentTurn: room.currentTurn,
      roomId: room._id,
      roomStatus: room.status,
    });

    if (!skipGate.ok) {
      throw roomError(skipGate.code, skipGate.message);
    }

    if (!assignment) {
      throw roomError("assignment_not_found", "No active assignment was found.");
    }

    const entryId = await ctx.db.insert("entries", {
      roomId: room._id,
      chainId: assignment.chainId,
      authorPlayerId: assignment.playerId,
      turn: assignment.turn,
      type: assignment.entryType,
      payload: skippedEntryPayload(assignment.entryType),
      createdAt: now,
      submittedAt: now,
    });

    await ctx.db.patch(assignment._id, {
      status: "skipped",
      submittedEntryId: entryId,
      skippedAt: now,
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
      advanced: advancement.advanced,
      assignmentId: assignment._id,
      chainId: assignment.chainId,
      ...(advancement.currentEntryType === undefined
        ? {}
        : { currentEntryType: advancement.currentEntryType }),
      currentTurn: advancement.currentTurn,
      entryId,
      roomId: room._id,
      roomStatus: advancement.roomStatus,
      skippedPlayerId: assignment.playerId,
      turn: assignment.turn,
      type: assignment.entryType,
    };
  },
});

export const sweepExpiredTurns = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const activeRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const room of activeRooms) {
      if (
        room.activeDeadlineAt !== undefined &&
        now >= room.activeDeadlineAt + TURN_EXPIRY_GRACE_MS
      ) {
        await ctx.scheduler.runAfter(0, internal.rooms.expireRoomTurn, {
          roomId: room._id,
        });
      }
    }

    return null;
  },
});

export const expireRoomTurn = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const room = await ctx.db.get(args.roomId);

    if (!room) {
      return null;
    }

    const currentAssignments = await getAssignmentsByRoomTurn(ctx, room._id, room.currentTurn);
    const sweep = getTurnExpirySweep({
      assignments: currentAssignments.map((assignment) => ({
        id: assignment._id,
        status: assignment.status,
      })),
      deadlineAt: room.activeDeadlineAt,
      now,
      roomStatus: room.status,
    });

    if (!sweep.shouldExpire) {
      return null;
    }

    const expiringIds = new Set(sweep.expiringAssignmentIds);

    for (const assignment of currentAssignments) {
      if (!expiringIds.has(assignment._id)) {
        continue;
      }

      const entryId = await ctx.db.insert("entries", {
        roomId: room._id,
        chainId: assignment.chainId,
        authorPlayerId: assignment.playerId,
        turn: assignment.turn,
        type: assignment.entryType,
        payload: expiredEntryPayload(assignment.entryType),
        createdAt: now,
        submittedAt: now,
      });

      await ctx.db.patch(assignment._id, {
        status: "expired",
        submittedEntryId: entryId,
        expiredAt: now,
      });

      await ctx.db.patch(assignment.chainId, {
        currentEntryId: entryId,
        updatedAt: now,
      });
    }

    await ctx.db.patch(room._id, {
      updatedAt: now,
    });
    await advanceRoomAfterTurnIfReady(ctx, room, now);

    return null;
  },
});

// Upper bound on rooms scheduled for archive/purge per lifecycle sweep so a large
// backlog is drained across several hourly runs instead of one heavy transaction.
const MAX_LIFECYCLE_ROOMS_PER_SWEEP = 50;

function roomLifecycleAction(room: Doc<"rooms">, now: number) {
  return getRoomLifecycleAction({
    archivedAt: room.archivedAt,
    now,
    revealedAt: room.revealedAt,
    status: room.status,
    updatedAt: room.updatedAt,
  });
}

/**
 * Hourly data-lifecycle sweep. Archives rooms that finished reveal long ago (kept
 * viewable) and abandoned rooms that stalled, then purges archived rooms past their
 * retention window. Enumerates candidates via the by_status index and schedules an
 * isolated per-room mutation for each, bounded per invocation.
 */
export const sweepRoomLifecycle = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    let scheduled = 0;

    // Archive phase: reveal rooms past their view window plus abandoned
    // setup/lobby/active rooms past the idle window.
    for (const status of ["reveal", "active", "lobby", "setup"] as const) {
      if (scheduled >= MAX_LIFECYCLE_ROOMS_PER_SWEEP) {
        break;
      }

      const rooms = await ctx.db
        .query("rooms")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();

      for (const room of rooms) {
        if (scheduled >= MAX_LIFECYCLE_ROOMS_PER_SWEEP) {
          break;
        }

        if (roomLifecycleAction(room, now) === "archive") {
          await ctx.scheduler.runAfter(0, internal.rooms.archiveRoom, { roomId: room._id });
          scheduled += 1;
        }
      }
    }

    // Purge phase: archived rooms past their retention window.
    const archivedRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .collect();

    for (const room of archivedRooms) {
      if (scheduled >= MAX_LIFECYCLE_ROOMS_PER_SWEEP) {
        break;
      }

      if (roomLifecycleAction(room, now) === "purge") {
        await ctx.scheduler.runAfter(0, internal.rooms.purgeRoom, { roomId: room._id });
        scheduled += 1;
      }
    }

    return null;
  },
});

export const archiveRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const room = await ctx.db.get(args.roomId);

    if (!room || roomLifecycleAction(room, now) !== "archive") {
      return null;
    }

    await ctx.db.patch(room._id, {
      archivedAt: now,
      status: "archived",
      updatedAt: now,
    });

    return null;
  },
});

export const purgeRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const room = await ctx.db.get(args.roomId);

    if (!room || roomLifecycleAction(room, now) !== "purge") {
      return null;
    }

    // Delete each drawing blob referenced by an entry payload, then the entries.
    // Skipped drawings and prompt/guess entries carry no storage artifact.
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_room_turn", (q) => q.eq("roomId", room._id))
      .collect();

    for (const entry of entries) {
      if ("drawing" in entry.payload) {
        await ctx.storage.delete(entry.payload.drawing.artifact.storageId);
      }

      await ctx.db.delete(entry._id);
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_room_turn", (q) => q.eq("roomId", room._id))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    const chains = await ctx.db
      .query("chains")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    for (const chain of chains) {
      await ctx.db.delete(chain._id);
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    // Deleting the room doc frees its code: createUniqueRoomCode only collides on
    // existing rooms (by_code lookup), so the code is available for reuse.
    await ctx.db.delete(room._id);

    return null;
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
      activeDeadlineAt: undefined,
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

  const activeDeadlineAt = getTurnDeadline({
    entryType: nextPhase.entryType,
    settings: room.settings,
    turnStartedAt: now,
  });

  await ctx.db.patch(room._id, {
    activeDeadlineAt,
    currentTurn: nextPhase.turn,
    currentEntryType: nextPhase.entryType,
    currentTurnStartedAt: now,
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

async function rebindSeatToToken(
  ctx: MutationCtx,
  playerId: Id<"players">,
  tokenHash: string,
  now: number,
) {
  await ctx.db.patch(playerId, {
    tokenHash,
    status: "connected",
    lastSeenAt: now,
    rejoinTokenHash: undefined,
    rejoinIssuedAt: undefined,
  });
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
  | {
      kind: "skipped";
      label: "Previous prompt" | "Previous guess" | "Previous drawing";
      turn: number;
      value: string;
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
    if ("skipped" in previousEntry.payload) {
      return {
        kind: "skipped",
        label: "Previous drawing",
        turn: previousEntry.turn,
        value: previousEntry.payload.reason,
      };
    }

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

async function getRevealChains(
  ctx: QueryCtx,
  roomId: Doc<"rooms">["_id"],
  playersById: Map<Doc<"players">["_id"], Doc<"players">>,
) {
  const chains = await getChainsByRoom(ctx, roomId);
  const revealChains = [];

  for (const chain of chains) {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_chain_turn", (q) => q.eq("chainId", chain._id))
      .collect();
    const revealEntries = [];

    for (const entry of entries) {
      const authorName = playerName(playersById, entry.authorPlayerId);

      if (entry.payload.type === "drawing") {
        if ("skipped" in entry.payload) {
          revealEntries.push({
            authorName,
            id: entry._id,
            skipped: true as const,
            text: entry.payload.reason,
            turn: entry.turn,
            type: "drawing" as const,
          });
          continue;
        }

        const imageUrl = await ctx.storage.getUrl(entry.payload.drawing.artifact.storageId);

        revealEntries.push({
          authorName,
          id: entry._id,
          ...(imageUrl === null ? {} : { imageUrl }),
          turn: entry.turn,
          type: "drawing" as const,
        });
      } else {
        revealEntries.push({
          authorName,
          id: entry._id,
          text: entry.payload.text,
          turn: entry.turn,
          type: entry.payload.type,
        });
      }
    }

    revealChains.push({
      entries: revealEntries.sort((left, right) => left.turn - right.turn),
      id: chain._id,
      order: chain.order,
      ownerName: playerName(playersById, chain.ownerPlayerId),
    });
  }

  return revealChains.sort((left, right) => left.order - right.order);
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

function playerName(
  playersById: Map<Doc<"players">["_id"], Doc<"players">>,
  playerId: Doc<"players">["_id"],
) {
  return playersById.get(playerId)?.displayName ?? "Unknown player";
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

function skippedEntryPayload(entryType: "prompt" | "drawing" | "guess") {
  if (entryType === "drawing") {
    return {
      reason: "Drawing skipped by host",
      skipped: true,
      type: "drawing",
    } as const;
  }

  return {
    text: `${entryType === "prompt" ? "Prompt" : "Guess"} skipped by host`,
    type: entryType,
  } as const;
}

function expiredEntryPayload(entryType: "prompt" | "drawing" | "guess") {
  if (entryType === "drawing") {
    return {
      reason: "Drawing timed out",
      skipped: true,
      type: "drawing",
    } as const;
  }

  return {
    text: `${entryType === "prompt" ? "Prompt" : "Guess"} timed out`,
    type: entryType,
  } as const;
}

function isPresent<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
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

function requireValidTimerSeconds(input: number) {
  const result = validateTimerSeconds(input);

  if (!result.ok) {
    throw roomError("invalid_timer_seconds", result.reason);
  }

  return result.value;
}

function requireValidPromptPackId(input: string | undefined): PromptPackId {
  const result = validatePromptPackId(input);

  if (!result.ok) {
    throw roomError("invalid_prompt_pack", result.reason);
  }

  return result.value;
}

function assertTurnAcceptsSubmission(deadlineAt: number | undefined, now: number) {
  const result = getTurnSubmissionGate({ deadlineAt, now });

  if (!result.ok) {
    throw roomError(result.code, result.message);
  }
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

function createRejoinSecret() {
  const bytes = new Uint8Array(PLAYER_TOKEN_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  let index = 0;

  return generatePlayerToken(() => {
    const byte = bytes[index];
    index += 1;

    if (byte === undefined) {
      throw new Error("Rejoin secret generator exhausted its byte buffer.");
    }

    return byte;
  });
}

function randomIndex(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

function roomError(code: string, message: string) {
  return new ConvexError({ code, message });
}
