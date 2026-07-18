import { ConvexError } from "convex/values";

// Production Convex deployments redact thrown error messages to
// "[CONVEX M(...)] [Request ID: ...] Server Error ..." and only preserve the
// structured payload on ConvexError.data, so user-facing copy must come from
// the payload, never from Error.message on a Convex error.
const redactedConvexMessagePattern = /^\[CONVEX [AMQ]\(/;

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    return convexPayloadMessage(error.data) ?? fallback;
  }

  if (error instanceof Error) {
    const message = error.message.trim();

    if (message.length > 0 && !redactedConvexMessagePattern.test(message)) {
      return message;
    }
  }

  return fallback;
}

function convexPayloadMessage(data: unknown): string | null {
  if (typeof data === "string") {
    return nonEmpty(data);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return nonEmpty(data.message);
  }

  return null;
}

function nonEmpty(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
