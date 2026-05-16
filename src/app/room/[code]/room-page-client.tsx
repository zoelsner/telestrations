"use client";

import { useMutation, useQuery } from "convex/react";
import { Crown, DoorOpen, Loader2, Play, RefreshCw, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import { api } from "../../../../convex/_generated/api";
import { Button, Panel, TextInput } from "@/components/ui";
import { normalizeRoomCode, validateDisplayName } from "@/domain/room-join";
import { getStartGameGate } from "@/domain/start-game";
import { getOrCreatePlayerToken } from "../../room-session";

type Lobby = NonNullable<ReturnType<typeof useQuery<typeof api.rooms.getLobby>>>;

export function RoomPageClient({
  code,
  convexConfigured,
}: {
  code: string;
  convexConfigured: boolean;
}) {
  const normalizedCode = normalizeRoomCode(code);

  if (!convexConfigured) {
    return <RoomUnavailable code={normalizedCode} />;
  }

  return <RoomPageLive code={normalizedCode} />;
}

function RoomPageLive({ code }: { code: string }) {
  const playerToken = usePlayerToken(code);

  const lobby = useQuery(api.rooms.getLobby, playerToken === null ? "skip" : { code, playerToken });

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[var(--app-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--app-muted)]">Room {code}</p>
            <h1 className="text-2xl font-semibold">Telestrations</h1>
          </div>
          <Link
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--app-soft)] sm:h-10 sm:w-auto"
            href="/"
          >
            Back to app
          </Link>
        </header>

        <section className="grid flex-1 gap-4 py-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="order-2 p-4 lg:order-1">
            {lobby === undefined ? (
              <LoadingRoom />
            ) : lobby === null ? (
              <MissingRoom code={code} />
            ) : (
              <LobbyView lobby={lobby} />
            )}
          </Panel>

          <Panel className="order-1 p-4 lg:order-2">
            {lobby === undefined || playerToken === null ? (
              <LoadingRoom />
            ) : lobby === null ? (
              <MissingRoom code={code} />
            ) : lobby.currentPlayer ? (
              <PlayerStatus code={code} lobby={lobby} playerToken={playerToken} />
            ) : (
              <JoinRoomForm code={code} playerToken={playerToken} />
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function usePlayerToken(code: string) {
  return useSyncExternalStore(
    emptySubscribe,
    () => getOrCreatePlayerToken(code),
    () => null,
  );
}

function emptySubscribe() {
  return () => {};
}

function LobbyView({ lobby }: { lobby: Lobby }) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Lobby</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            {lobby.room.playerCount}/{lobby.room.maxPlayers} players joined
          </p>
        </div>
        <span className="w-fit rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
          {lobby.room.status}
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        {lobby.players.map((player) => (
          <div
            className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-[var(--app-soft)] px-3 py-2 text-sm sm:min-h-11 sm:py-0"
            key={player.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-medium text-[var(--app-muted)]">
                {player.order + 1}
              </span>
              <span className="truncate font-medium">{player.displayName}</span>
              {player.isCurrentPlayer ? (
                <span className="shrink-0 text-xs text-[var(--app-muted)]">You</span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--app-muted)]">
              {player.isHost ? <Crown size={14} /> : <UserRound size={14} />}
              <span>{player.isHost ? "Host" : player.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinRoomForm({ code, playerToken }: { code: string; playerToken: string }) {
  const joinRoom = useMutation(api.rooms.joinRoom);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayNameResult = validateDisplayName(displayName);

    if (!displayNameResult.ok) {
      setError(displayNameResult.reason);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await joinRoom({
        code,
        displayName: displayNameResult.value,
        playerToken,
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-sm font-semibold">Join room</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Enter a display name for this round.</p>
      </div>
      <label>
        <span className="text-xs font-medium uppercase text-[var(--app-muted)]">Your name</span>
        <TextInput
          className="mt-2"
          disabled={isSubmitting}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Taylor"
          value={displayName}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <DoorOpen size={16} />}
        Join
      </Button>
    </form>
  );
}

function PlayerStatus({
  code,
  lobby,
  playerToken,
}: {
  code: string;
  lobby: Lobby;
  playerToken: string;
}) {
  const startGame = useMutation(api.rooms.startGame);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHost = lobby.currentPlayer?.isHost === true;
  const startGate = getStartGameGate({
    existingChainCount: 0,
    isHost,
    playerCount: lobby.room.playerCount,
    roomStatus: lobby.room.status,
  });
  const gameStarted = lobby.room.status === "active" || lobby.room.status === "reveal";

  async function handleStartGame() {
    if (!startGate.ok || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await startGame({ code, playerToken });
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-sm font-semibold">{isHost ? "Host ready" : "Joined"}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
        {gameStarted
          ? "Game is active. Keep this tab open while the round runs."
          : "Keep this tab open. Refresh will restore this player slot."}
      </p>
      {isHost && !gameStarted ? (
        <>
          <Button
            className="w-full"
            disabled={!startGate.ok || isSubmitting}
            onClick={handleStartGame}
            variant="primary"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            Start game
          </Button>
          {!startGate.ok ? (
            <p className="text-sm leading-6 text-[var(--app-muted)]">{startGate.message}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function LoadingRoom() {
  return (
    <div className="flex min-h-32 items-center justify-center text-sm text-[var(--app-muted)]">
      <RefreshCw className="mr-2 animate-spin" size={16} />
      Loading room
    </div>
  );
}

function MissingRoom({ code }: { code: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Room not found</h2>
      <p className="mt-1 text-sm text-[var(--app-muted)]">
        Room {code} is missing, archived, or using a different deployment.
      </p>
    </div>
  );
}

function RoomUnavailable({ code }: { code: string }) {
  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-[var(--app-border)] pb-5">
          <p className="text-sm font-medium text-[var(--app-muted)]">Room {code}</p>
          <h1 className="text-2xl font-semibold">Telestrations</h1>
        </header>
        <Panel className="mt-5 p-4">
          <h2 className="text-xl font-semibold">Live rooms are unavailable</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Convex is not configured for this environment.
          </p>
          <Link
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--app-soft)] sm:h-10 sm:w-auto"
            href="/"
          >
            Back to app
          </Link>
        </Panel>
      </div>
    </main>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not join the room.";
}
