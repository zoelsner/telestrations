export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 32;
export const PLAYER_TOKEN_BYTE_LENGTH = 32;

const roomCodePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const playerTokenPattern = /^[A-Za-z0-9_-]{12,128}$/;
const controlCharacterPattern = /[\u0000-\u001F\u007F]/;
const hexAlphabet = "0123456789abcdef";

export type ValidationResult = { ok: true; value: string } | { ok: false; reason: string };

export function normalizeRoomCode(input: string): string {
  const withoutQuery = input.trim().split(/[?#]/, 1)[0] ?? "";
  const pathSegments = withoutQuery.split("/").filter(Boolean);
  const candidate = pathSegments.at(-1) ?? withoutQuery;

  return candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateRoomCode(input: string): ValidationResult {
  const value = normalizeRoomCode(input);

  if (roomCodePattern.test(value)) {
    return { ok: true, value };
  }

  return {
    ok: false,
    reason: "Room code must be 4 characters using A-Z and 2-9 without I, O, 1, or 0.",
  };
}

export function generateRoomCode(nextIndex: (maxExclusive: number) => number): string {
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const alphabetIndex = nextIndex(ROOM_CODE_ALPHABET.length);
    const character = ROOM_CODE_ALPHABET[alphabetIndex];

    if (character === undefined) {
      throw new Error("Room code random index was outside the room-code alphabet.");
    }

    code += character;
  }

  return code;
}

export function normalizeDisplayName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(input: string): ValidationResult {
  if (controlCharacterPattern.test(input)) {
    return { ok: false, reason: "Display name cannot include control characters." };
  }

  const value = normalizeDisplayName(input);

  if (value.length === 0) {
    return { ok: false, reason: "Enter a display name." };
  }

  if (value.length < DISPLAY_NAME_MIN_LENGTH) {
    return { ok: false, reason: "Display name must be at least 2 characters." };
  }

  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, reason: "Display name must be 32 characters or fewer." };
  }

  return { ok: true, value };
}

export function playerTokenStorageKey(roomCode: string): string {
  return `telestrations:room:${normalizeRoomCode(roomCode)}:player-token`;
}

export function generatePlayerToken(nextByte: () => number): string {
  let token = "";

  for (let index = 0; index < PLAYER_TOKEN_BYTE_LENGTH; index += 1) {
    const byte = nextByte();

    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error("Player token byte generator returned an invalid byte.");
    }

    const highNibble = hexAlphabet[Math.floor(byte / 16)];
    const lowNibble = hexAlphabet[byte % 16];

    if (highNibble === undefined || lowNibble === undefined) {
      throw new Error("Player token byte could not be encoded.");
    }

    token += highNibble + lowNibble;
  }

  return token;
}

export function validatePlayerToken(input: string): ValidationResult {
  if (playerTokenPattern.test(input)) {
    return { ok: true, value: input };
  }

  return { ok: false, reason: "Player token is invalid." };
}
