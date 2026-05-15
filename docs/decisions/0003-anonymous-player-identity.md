# Decision 0003: Anonymous Player Identity

## Status

Accepted for MVP planning.

## Context

Telestrations uses team-only anonymous rooms: a host shares a room link, players
enter a display name, and no account is required. The app still needs stable
identity for reconnect, turn assignment, host recovery controls, and server-side
validation.

This decision feeds issue #4, which implements room creation and joining, and
issue #11, which implements reconnect and stuck-game recovery. Those issues
should not invent separate identity rules.

## Contract

- Each browser creates a random room-scoped player token before joining a room.
- The token is stored in local browser storage under the room code or room id.
- The token is sent to Convex mutations that need to identify the acting player.
- Convex stores one player slot per `(roomId, playerToken)` pair.
- Display names are labels only. They are not unique identity and may collide.
- A refresh mid-turn reuses the same local token and restores the same player
  slot, current assignment, submitted state, and timer context.
- A duplicate tab with the same local token controls the same player slot. The
  latest valid submission wins only while the turn is still open and the player
  has not already submitted.
- A second device creates a different token and is a new player unless a later
  explicit takeover flow is added. MVP does not support takeover.
- A player returning after the turn advances sees the current room state. They do
  not regain the missed assignment unless the host uses a recovery control.
- The host may remove a player before the game starts. During a game, the host
  may skip a missing player for the current turn or advance the room according to
  the recovery rules in issue #11.
- Host remove and skip actions must mark player state explicitly instead of
  deleting history needed for reveal or audit.

## Server-Side Validation

Convex mutations must validate:

- The room exists and is in a state where the action is allowed.
- The player token maps to an active player slot in that room.
- The acting player is the host for host-only actions.
- The player is assigned to the submitted chain for the current turn.
- The entry type matches the current task: prompt, drawing, or guess.
- The turn is still open, or the action is an allowed timeout/recovery action.
- A player cannot submit twice for the same turn after their submission is
  accepted.
- Room capacity is not exceeded when joining.
- Display names meet length and content rules but are not treated as identity.

## Privacy And Security

The token is a bearer secret scoped to one room. This is acceptable for a
team-only party game, but it is not an authentication system. Links and tokens
should not expose other private data, and server mutations must never trust
client-provided player ids without checking the token-to-slot mapping.

## Consequences

- Issue #4 should create and persist the room-scoped token before calling
  `joinRoom`.
- Issue #4 should allow duplicate display names while making same-name players
  visually distinguishable in the lobby.
- Issue #11 should restore player state from the token on refresh and define the
  host controls for skipped, removed, and late-returning players.
- Future account, invite, or takeover features can layer on top of this contract
  without changing the MVP room and turn model.
