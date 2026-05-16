import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { MAX_PLAYERS_PER_ROOM } from "../src/domain/game-state";
import {
  generateRoomCode,
  validateDisplayName,
  validatePlayerToken,
  validateRoomCode,
} from "../src/domain/room-join";

const roomResult = v.object({
  roomId: v.id("rooms"),
  playerId: v.id("players"),
  code: v.string(),
  sharePath: v.string(),
  isHost: v.boolean(),
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
