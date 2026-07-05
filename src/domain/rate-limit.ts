export type RateLimitState = { windowStartMs: number; count: number };

export type RateLimitDecision =
  | { allowed: true; next: RateLimitState }
  | { allowed: false; retryAfterMs: number };

export type RateLimitInput = {
  now: number;
  windowMs: number;
  limit: number;
  state: RateLimitState | null;
};

/**
 * Pure fixed-window rate-limit decision. Given the current window state for a key
 * (or `null` for a never-seen key), decides whether a call is allowed and, if so,
 * the state to persist. Key-agnostic: callers decide what identity or scope a key
 * represents (per-token bucket, or a shared global bucket).
 */
export function evaluateRateLimit({
  now,
  windowMs,
  limit,
  state,
}: RateLimitInput): RateLimitDecision {
  if (state === null || now - state.windowStartMs >= windowMs) {
    return { allowed: true, next: { windowStartMs: now, count: 1 } };
  }

  if (state.count < limit) {
    return { allowed: true, next: { windowStartMs: state.windowStartMs, count: state.count + 1 } };
  }

  return { allowed: false, retryAfterMs: state.windowStartMs + windowMs - now };
}

export type RateLimitScope = "global" | "token";

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
  scope: RateLimitScope;
};

// Fixed-window budgets. A real party of 15 humans never approaches these.
export const RATE_LIMITS = {
  // Global: the client mints a brand-new random playerToken on every createRoom
  // call (the per-room token cannot exist before the room does), so a per-token
  // key would be fresh every call and would never fire. Key on a constant string
  // instead: a shared ceiling across all callers.
  createRoom: { limit: 30, windowMs: 60_000, scope: "global" }, // shared ceiling; room creation is rare at scale
  joinRoom: { limit: 10, windowMs: 60_000, scope: "token" }, // join/rejoin/name-change are rare
  drawingUploadUrl: { limit: 20, windowMs: 60_000, scope: "token" }, // few retries per 90s turn; caps orphans
} as const satisfies Record<string, RateLimitConfig>;

export const CREATE_ROOM_GLOBAL_KEY = "createRoom:global";

// Rows older than this are safe to prune (their window has long since reset).
export const RATE_LIMIT_ROW_TTL_MS = 24 * 60 * 60 * 1000;
