export const MAX_PLAYERS_PER_ROOM = 15;

export const ROOM_STATUSES = ["setup", "lobby", "active", "reveal", "archived"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ENTRY_TYPES = ["prompt", "drawing", "guess"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const PLAYER_STATUSES = ["connected", "disconnected", "removed"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ["pending", "submitted", "skipped", "expired"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const PROMPT_MODES = ["player-written", "safe-pack", "mixed"] as const;
export type PromptMode = (typeof PROMPT_MODES)[number];

export const DRAWING_PAYLOAD_VERSION = 1;
