import type { EntryType, PromptMode } from "./game-state";

export type ArchiveTextEntryInput = {
  authorName: string;
  text: string;
  turn: number;
  type: "prompt" | "guess";
};

export type ArchiveDrawingEntryInput = {
  authorName: string;
  imageUrl?: string;
  skipped?: boolean;
  text?: string;
  turn: number;
  type: "drawing";
};

export type ArchiveEntryInput = ArchiveTextEntryInput | ArchiveDrawingEntryInput;

export type ArchiveChainInput = {
  entries: ArchiveEntryInput[];
  order: number;
  ownerName: string;
};

export type ArchivePlayerInput = {
  displayName: string;
  isHost: boolean;
  order: number;
};

export type ArchiveRoomInput = {
  code: string;
  settings: {
    drawingSeconds: number;
    guessingSeconds: number;
    promptMode: PromptMode;
    promptPackLabel?: string;
  };
};

export type ArchiveEntry = {
  authorName: string;
  body?: string;
  imageUrl?: string;
  isSkipped: boolean;
  label: string;
  turn: number;
  type: EntryType;
};

export type ArchiveChain = {
  entries: ArchiveEntry[];
  label: string;
  order: number;
  ownerName: string;
};

export type ArchiveManifest = {
  chains: ArchiveChain[];
  fileName: string;
  generatedAt: number;
  roomCode: string;
  summaryLines: string[];
  title: string;
};

export function buildArchiveManifest({
  chains,
  generatedAt,
  players,
  room,
}: {
  chains: ArchiveChainInput[];
  generatedAt: number;
  players: ArchivePlayerInput[];
  room: ArchiveRoomInput;
}): ArchiveManifest {
  const roomCode = normalizeRoomCodeForArchive(room.code);
  const generatedDate = formatArchiveDate(generatedAt);
  const orderedPlayers = [...players].sort((left, right) => left.order - right.order);

  return {
    chains: [...chains]
      .sort((left, right) => left.order - right.order)
      .map((chain, index) => ({
        entries: [...chain.entries]
          .sort((left, right) => left.turn - right.turn)
          .map((entry) => buildArchiveEntry(entry)),
        label: `Chain ${index + 1}`,
        order: chain.order,
        ownerName: chain.ownerName,
      })),
    fileName: `telestrations-${roomCode}-${formatArchiveDateSlug(generatedAt)}.pdf`,
    generatedAt,
    roomCode,
    summaryLines: [
      `Generated ${generatedDate}`,
      `Players: ${formatPlayers(orderedPlayers)}`,
      `Prompts: ${formatPromptMode(room.settings)}`,
      `Timers: ${formatTimers(room.settings)}`,
    ],
    title: `Telestrations ${roomCode}`,
  };
}

function buildArchiveEntry(entry: ArchiveEntryInput): ArchiveEntry {
  if (entry.type === "drawing") {
    return {
      authorName: entry.authorName,
      ...(entry.skipped ? { body: entry.text ?? "Drawing skipped by host" } : {}),
      ...(entry.imageUrl === undefined ? {} : { imageUrl: entry.imageUrl }),
      isSkipped: entry.skipped === true,
      label: `${turnLabel(entry.turn)} · Drawing`,
      turn: entry.turn,
      type: "drawing",
    };
  }

  return {
    authorName: entry.authorName,
    body: entry.text,
    isSkipped: false,
    label: `${turnLabel(entry.turn)} · ${entry.type === "prompt" ? "Prompt" : "Guess"}`,
    turn: entry.turn,
    type: entry.type,
  };
}

function normalizeRoomCodeForArchive(code: string) {
  const normalizedCode = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

  return normalizedCode.length > 0 ? normalizedCode : "ROOM";
}

function formatArchiveDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatArchiveDateSlug(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatPlayers(players: ArchivePlayerInput[]) {
  if (players.length === 0) {
    return "No players recorded";
  }

  return players
    .map((player) => `${player.displayName}${player.isHost ? " (host)" : ""}`)
    .join(", ");
}

function formatPromptMode(settings: ArchiveRoomInput["settings"]) {
  if (settings.promptMode === "safe-pack") {
    return settings.promptPackLabel
      ? `App prompt pack - ${settings.promptPackLabel}`
      : "App prompt pack";
  }

  if (settings.promptMode === "mixed") {
    return "Mixed prompts";
  }

  return "Players write prompts";
}

function formatTimers(settings: ArchiveRoomInput["settings"]) {
  if (settings.drawingSeconds === 0 && settings.guessingSeconds === 0) {
    return "Off";
  }

  return `Drawing ${formatTimer(settings.drawingSeconds)}, guessing ${formatTimer(
    settings.guessingSeconds,
  )}`;
}

function formatTimer(seconds: number) {
  if (seconds === 0) {
    return "off";
  }

  if (seconds < 120) {
    return `${seconds}s`;
  }

  return `${seconds / 60} min`;
}

function turnLabel(turn: number) {
  return `Turn ${turn}`;
}
