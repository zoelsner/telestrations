export const HEARTBEAT_INTERVAL_MS = 15_000; // 15 s: client heartbeat cadence
export const PRESENCE_TIMEOUT_MS = 40_000; // 40 s: seat is "disconnected" past this idle

export function isPlayerDisconnected(input: {
  lastSeenAt: number;
  now: number;
  timeoutMs?: number;
}): boolean {
  const timeoutMs = input.timeoutMs ?? PRESENCE_TIMEOUT_MS;
  return input.now - input.lastSeenAt > timeoutMs;
}
