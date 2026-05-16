import {
  generatePlayerToken,
  playerTokenStorageKey,
  validatePlayerToken,
} from "@/domain/room-join";

export function getOrCreatePlayerToken(roomCode: string) {
  const key = playerTokenStorageKey(roomCode);
  const storedToken = window.localStorage.getItem(key);
  const storedTokenResult = storedToken ? validatePlayerToken(storedToken) : null;

  if (storedTokenResult?.ok) {
    return storedTokenResult.value;
  }

  const token = createPlayerToken();
  window.localStorage.setItem(key, token);

  return token;
}

export function savePlayerToken(roomCode: string, playerToken: string) {
  window.localStorage.setItem(playerTokenStorageKey(roomCode), playerToken);
}

export function createPlayerToken() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let index = 0;

  return generatePlayerToken(() => {
    const byte = bytes[index];
    index += 1;

    if (byte === undefined) {
      throw new Error("Browser token generator exhausted its byte buffer.");
    }

    return byte;
  });
}
