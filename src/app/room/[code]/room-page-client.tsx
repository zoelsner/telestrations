"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  DoorOpen,
  Image as ImageIcon,
  Loader2,
  Palette,
  Play,
  RefreshCw,
  Send,
  SkipForward,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DrawingBoard, type DrawingBoardValue } from "@/components/drawing-board";
import { Button, Panel, TextInput } from "@/components/ui";
import { buildActiveTaskView, type ActiveTaskPreviousEntry } from "@/domain/active-task";
import { CANVAS_SIZE, DRAWING_BACKGROUND_COLOR } from "@/domain/drawing";
import { buildRevealView } from "@/domain/reveal";
import { normalizeRoomCode, validateDisplayName } from "@/domain/room-join";
import { getStartGameGate } from "@/domain/start-game";
import { TIMER_SECONDS, getTurnTimerState } from "@/domain/timer";
import { getOrCreatePlayerToken } from "../../room-session";

type Lobby = NonNullable<ReturnType<typeof useQuery<typeof api.rooms.getLobby>>>;
type ActiveTask = NonNullable<ReturnType<typeof useQuery<typeof api.rooms.getActiveTask>>>;
type Reveal = NonNullable<ReturnType<typeof useQuery<typeof api.rooms.getReveal>>>;
type RevealChain = NonNullable<Reveal>["chains"][number];
type RevealEntry = RevealChain["entries"][number];

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
  const activeTask = useQuery(
    api.rooms.getActiveTask,
    playerToken === null ? "skip" : { code, playerToken },
  );
  const reveal = useQuery(
    api.rooms.getReveal,
    playerToken === null ? "skip" : { code, playerToken },
  );
  const showActiveTask =
    lobby !== undefined &&
    lobby !== null &&
    lobby.currentPlayer !== null &&
    lobby.room.status === "active";
  const showReveal =
    lobby !== undefined &&
    lobby !== null &&
    lobby.currentPlayer !== null &&
    lobby.room.status === "reveal";

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
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
          <Panel className={`order-1 ${showActiveTask ? "overflow-hidden" : "p-4"}`}>
            {lobby === undefined ? (
              <LoadingRoom />
            ) : lobby === null ? (
              <MissingRoom code={code} />
            ) : showReveal ? (
              reveal === undefined ? (
                <LoadingRoom />
              ) : (
                <RevealSurface code={code} reveal={reveal} />
              )
            ) : showActiveTask ? (
              activeTask === undefined || playerToken === null ? (
                <LoadingRoom />
              ) : (
                <ActiveTaskSurface activeTask={activeTask} code={code} playerToken={playerToken} />
              )
            ) : (
              <LobbyView lobby={lobby} />
            )}
          </Panel>

          <div className="order-2 grid content-start gap-4">
            <Panel className="p-4">
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

            {(showActiveTask || showReveal) && lobby !== undefined && lobby !== null ? (
              <Panel className="p-4">
                <LobbyView lobby={lobby} compact />
              </Panel>
            ) : null}
          </div>
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

function LobbyView({ compact = false, lobby }: { compact?: boolean; lobby: Lobby }) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={compact ? "text-sm font-semibold" : "text-xl font-semibold"}>Lobby</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            {lobby.room.playerCount}/{lobby.room.maxPlayers} players joined
          </p>
        </div>
        <span className="w-fit rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
          {lobby.room.status}
        </span>
      </div>

      <div className={`${compact ? "mt-4" : "mt-5"} grid gap-2`}>
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

function ActiveTaskSurface({
  activeTask,
  code,
  playerToken,
}: {
  activeTask: ActiveTask | null;
  code: string;
  playerToken: string;
}) {
  if (activeTask === null) {
    return <MissingRoom code={code} />;
  }

  const taskView = buildActiveTaskView({
    assignment:
      activeTask.assignment === null
        ? null
        : {
            entryType: activeTask.assignment.entryType,
            ...(activeTask.assignment.previousEntry === undefined
              ? {}
              : { previousEntry: activeTask.assignment.previousEntry }),
            status: activeTask.assignment.status,
            ...(activeTask.assignment.submittedEntryId === undefined
              ? {}
              : { submittedEntryId: activeTask.assignment.submittedEntryId }),
            turn: activeTask.assignment.turn,
          },
    currentTurn: activeTask.room.currentTurn,
    roomStatus: activeTask.room.status,
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--app-muted)]">Turn {taskView.currentTurn}</p>
          <h2 className="text-xl font-semibold">{taskView.title}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <TurnTimer deadlineAt={activeTask.room.activeDeadlineAt} />
          <RoundProgress round={activeTask.round} />
        </div>
      </div>

      {taskView.state === "compose" ? (
        <div className="grid flex-1 gap-4 p-4">
          {"previousEntry" in taskView && taskView.previousEntry ? (
            <PreviousEntry entry={taskView.previousEntry} />
          ) : taskView.entryType === "prompt" ? (
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft)] px-3 py-2 text-sm text-[var(--app-muted)]">
              Start a new chain with a short, work-safe prompt.
            </div>
          ) : null}

          {taskView.entryType === "drawing" ? (
            <DrawingTaskForm
              code={code}
              playerToken={playerToken}
              submitLabel={taskView.submitLabel}
            />
          ) : (
            <TextTaskForm
              code={code}
              entryType={taskView.entryType}
              inputLabel={taskView.inputLabel}
              maxLength={taskView.maxLength}
              playerToken={playerToken}
              submitLabel={taskView.submitLabel}
            />
          )}
        </div>
      ) : taskView.state === "waiting" ? (
        <WaitingForTurn
          canRecover={activeTask.currentPlayer?.isHost === true}
          code={code}
          playerToken={playerToken}
          round={activeTask.round}
        />
      ) : (
        <InactiveTaskState title={taskView.title} />
      )}
    </div>
  );
}

function TextTaskForm({
  code,
  entryType,
  inputLabel,
  maxLength,
  playerToken,
  submitLabel,
}: {
  code: string;
  entryType: "prompt" | "guess";
  inputLabel: string;
  maxLength: number;
  playerToken: string;
  submitLabel: string;
}) {
  const submitEntry = useMutation(api.rooms.submitEntry);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedText = text.trim().replace(/\s+/g, " ");
  const canSubmit = normalizedText.length > 0 && normalizedText.length <= maxLength;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isSubmitting) {
      setError(`Enter ${maxLength} characters or fewer before submitting.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await submitEntry({
        code,
        payload:
          entryType === "prompt"
            ? { text: normalizedText, type: "prompt" }
            : { text: normalizedText, type: "guess" },
        playerToken,
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not submit this turn."));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label>
        <span className="text-xs font-medium uppercase text-[var(--app-muted)]">{inputLabel}</span>
        <TextInput
          className="mt-2"
          disabled={isSubmitting}
          maxLength={maxLength}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            entryType === "prompt" ? "A project kickoff on roller skates" : "Type what you see"
          }
          value={text}
        />
      </label>
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--app-muted)]">
        <span>
          {entryType === "prompt" ? "Keep it safe for work." : "One clear guess is enough."}
        </span>
        <span>
          {normalizedText.length}/{maxLength}
        </span>
      </div>
      {error ? <ErrorText message={error} /> : null}
      <Button
        className="w-full sm:w-fit"
        disabled={!canSubmit || isSubmitting}
        type="submit"
        variant="primary"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        {submitLabel}
      </Button>
    </form>
  );
}

function DrawingTaskForm({
  code,
  playerToken,
  submitLabel,
}: {
  code: string;
  playerToken: string;
  submitLabel: string;
}) {
  const generateDrawingUploadUrl = useMutation(api.rooms.generateDrawingUploadUrl);
  const submitEntry = useMutation(api.rooms.submitEntry);
  const [drawing, setDrawing] = useState<DrawingBoardValue>({
    exportStatus: { kind: "empty" },
    strokes: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleDrawingChange = useCallback((value: DrawingBoardValue) => {
    setDrawing(value);
  }, []);
  const canSubmit = drawing.exportStatus.kind === "ready" && drawing.strokes.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (drawing.exportStatus.kind !== "ready" || drawing.strokes.length === 0 || isSubmitting) {
      setError("Draw something before submitting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const uploadUrl = await generateDrawingUploadUrl({ code, playerToken });
      const imageBlob = await dataUrlToBlob(drawing.exportStatus.dataUrl);
      const uploadResponse = await fetch(uploadUrl, {
        body: imageBlob,
        headers: { "Content-Type": "image/png" },
        method: "POST",
      });

      if (!uploadResponse.ok) {
        throw new Error("Drawing upload failed.");
      }

      const uploadJson: unknown = await uploadResponse.json();

      if (!isStorageUploadResponse(uploadJson)) {
        throw new Error("Drawing upload did not return a storage id.");
      }

      await submitEntry({
        code,
        payload: {
          drawing: {
            artifact: {
              byteSize: drawing.exportStatus.byteSize,
              height: CANVAS_SIZE.height,
              mimeType: "image/png",
              storageId: uploadJson.storageId,
              width: CANVAS_SIZE.width,
            },
            background: {
              color: DRAWING_BACKGROUND_COLOR,
              type: "solid",
            },
            canvas: CANVAS_SIZE,
            strokes: drawing.strokes,
            version: 1,
          },
          type: "drawing",
        },
        playerToken,
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not submit this drawing."));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <DrawingBoard disabled={isSubmitting} onChange={handleDrawingChange} />
      {error ? <ErrorText message={error} /> : null}
      <Button
        className="w-full sm:w-fit"
        disabled={!canSubmit || isSubmitting}
        type="submit"
        variant="primary"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        {submitLabel}
      </Button>
    </form>
  );
}

function PreviousEntry({ entry }: { entry: ActiveTaskPreviousEntry }) {
  return (
    <section className="border-b border-[var(--app-border)] bg-[var(--app-soft)] px-4 py-3 -mx-4 -mt-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--app-muted)]">
        {entry.kind === "drawing" ? (
          <ImageIcon size={14} />
        ) : entry.kind === "skipped" ? (
          <SkipForward size={14} />
        ) : (
          <Palette size={14} />
        )}
        <span>
          {entry.label} · Turn {entry.turn}
        </span>
      </div>
      {entry.kind === "drawing" ? (
        <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--paper)]">
          <Image
            alt="Previous drawing"
            className="object-contain"
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            src={entry.imageUrl}
            unoptimized
          />
        </div>
      ) : (
        <p className="mt-2 text-lg font-medium leading-7">{entry.value}</p>
      )}
    </section>
  );
}

function WaitingForTurn({
  canRecover,
  code,
  playerToken,
  round,
}: {
  canRecover: boolean;
  code: string;
  playerToken: string;
  round: ActiveTask["round"];
}) {
  const skipAssignment = useMutation(api.rooms.skipAssignment);
  const [skippingAssignmentId, setSkippingAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSkip(player: ActiveTask["round"]["players"][number]) {
    if (skippingAssignmentId !== null || player.assignmentStatus !== "pending") {
      return;
    }

    setError(null);
    setSkippingAssignmentId(player.assignmentId);

    try {
      await skipAssignment({
        assignmentId: player.assignmentId,
        code,
        playerToken,
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not skip this assignment."));
    } finally {
      setSkippingAssignmentId(null);
    }
  }

  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:text-left">
        <span className="mx-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--app-soft)] text-[var(--app-muted)] sm:mx-0">
          <Clock3 size={22} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Waiting for the next turn</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            {round.pendingCount}{" "}
            {round.pendingCount === 1 ? "player still needs" : "players still need"} to submit.
          </p>
        </div>
      </div>

      <section className="grid gap-2" aria-label="Turn status">
        {round.players.map((player) => {
          const isPending = player.assignmentStatus === "pending";
          const isSkipping = skippingAssignmentId === player.assignmentId;

          return (
            <div
              className="flex min-h-12 flex-col justify-between gap-3 rounded-md border border-[var(--app-border)] bg-white px-3 py-3 text-sm sm:flex-row sm:items-center"
              key={player.assignmentId}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    isPending
                      ? "bg-[var(--app-soft)] text-[var(--app-muted)]"
                      : "bg-[var(--app-foreground)] text-white"
                  }`}
                >
                  {isPending ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {player.displayName}
                    {player.isCurrentPlayer ? (
                      <span className="ml-2 text-xs font-normal text-[var(--app-muted)]">You</span>
                    ) : null}
                  </p>
                  <p className="text-xs capitalize text-[var(--app-muted)]">
                    {player.assignmentStatus}
                    {player.playerStatus !== "connected" ? ` · ${player.playerStatus}` : ""}
                    {player.isHost ? " · Host" : ""}
                  </p>
                </div>
              </div>

              {canRecover && isPending ? (
                <Button
                  aria-label={`Skip ${player.displayName}`}
                  className="w-full sm:w-fit"
                  disabled={isSkipping}
                  onClick={() => handleSkip(player)}
                >
                  {isSkipping ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <SkipForward size={16} />
                  )}
                  Skip
                </Button>
              ) : null}
            </div>
          );
        })}
      </section>

      {round.skippedCount > 0 ? (
        <p className="text-sm leading-6 text-[var(--app-muted)]">
          {round.skippedCount} {round.skippedCount === 1 ? "assignment was" : "assignments were"}{" "}
          skipped by the host this turn.
        </p>
      ) : null}
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function InactiveTaskState({ title }: { title: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--app-soft)] text-[var(--app-muted)]">
        <AlertCircle size={22} />
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}

function TurnTimer({ deadlineAt }: { deadlineAt: number | undefined }) {
  const now = useNow(1_000);
  const timerState = getTurnTimerState({ deadlineAt, now });

  if (timerState.state === "off") {
    return null;
  }

  return (
    <div
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
        timerState.state === "expired"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[var(--app-border)] bg-white text-[var(--app-foreground)]"
      }`}
    >
      <Clock3 size={16} />
      {timerState.state === "expired" ? "Overdue" : formatTimerSeconds(timerState.remainingSeconds)}
    </div>
  );
}

function RoundProgress({ round }: { round: ActiveTask["round"] }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--app-border)] bg-white text-center text-xs">
      <RoundProgressCell label="Done" value={round.completedCount} />
      <RoundProgressCell label="Pending" value={round.pendingCount} />
      <RoundProgressCell label="Total" value={round.totalCount} />
    </div>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}

function formatTimerSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function timerOptionLabel(seconds: number) {
  if (seconds === 0) {
    return "Off";
  }

  if (seconds < 120) {
    return `${seconds}s`;
  }

  return `${seconds / 60} min`;
}

function RoundProgressCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 border-r border-[var(--app-border)] px-3 py-2 last:border-r-0">
      <div className="font-semibold text-[var(--app-foreground)]">{value}</div>
      <div className="text-[var(--app-muted)]">{label}</div>
    </div>
  );
}

function RevealSurface({ code, reveal }: { code: string; reveal: Reveal | null }) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  if (reveal === null) {
    return <MissingRoom code={code} />;
  }

  if (reveal.room.status !== "reveal" && reveal.room.status !== "archived") {
    return <InactiveTaskState title="Reveal is not ready" />;
  }

  const revealView = buildRevealView({
    chains: reveal.chains,
    selectedChainId,
  });
  const selectedChain = revealView.selectedChain;

  function selectByOffset(offset: number) {
    const nextItem = revealView.overview[revealView.currentIndex + offset];

    if (nextItem) {
      setSelectedChainId(nextItem.id);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--app-muted)]">Room {reveal.room.code}</p>
          <h2 className="text-xl font-semibold">Final reveal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous chain"
            disabled={!revealView.canGoPrevious}
            onClick={() => selectByOffset(-1)}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          <Button
            aria-label="Next chain"
            disabled={!revealView.canGoNext}
            onClick={() => selectByOffset(1)}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Reveal chains" className="grid content-start gap-2">
          {revealView.overview.map((item) => (
            <button
              className={`min-h-12 rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)] ${
                item.isSelected
                  ? "border-[var(--app-foreground)] bg-[var(--app-foreground)] text-white"
                  : "border-[var(--app-border)] bg-white text-[var(--app-foreground)] hover:bg-[var(--app-soft)]"
              }`}
              key={item.id}
              onClick={() => setSelectedChainId(item.id)}
              type="button"
            >
              <span className="block font-medium">{item.label}</span>
              <span
                className={`block truncate text-xs ${
                  item.isSelected ? "text-white/75" : "text-[var(--app-muted)]"
                }`}
              >
                {item.ownerName}
              </span>
            </button>
          ))}
        </nav>

        {selectedChain ? (
          <section className="min-w-0">
            <div className="flex flex-col gap-1 border-b border-[var(--app-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedChain.label}</h3>
                <p className="text-sm text-[var(--app-muted)]">
                  Started by {selectedChain.ownerName}
                </p>
              </div>
              <p className="text-sm text-[var(--app-muted)]">
                {revealView.currentIndex + 1}/{revealView.chainCount}
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {selectedChain.entries.map((entry) => (
                <RevealEntryCard entry={entry} key={entry.id} />
              ))}
            </div>
          </section>
        ) : (
          <InactiveTaskState title="No completed chains yet" />
        )}
      </div>
    </div>
  );
}

function RevealEntryCard({ entry }: { entry: RevealEntry }) {
  return (
    <article className="rounded-md border border-[var(--app-border)] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase text-[var(--app-muted)]">
        <span>
          Turn {entry.turn} · {entry.type}
        </span>
        <span>{entry.authorName}</span>
      </div>

      {entry.type === "drawing" && "skipped" in entry ? (
        <p className="mt-3 text-lg font-medium leading-7">{entry.text}</p>
      ) : entry.type === "drawing" ? (
        entry.imageUrl ? (
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--paper)]">
            <Image
              alt={`Drawing from turn ${entry.turn}`}
              className="object-contain"
              fill
              sizes="(max-width: 1024px) 100vw, 760px"
              src={entry.imageUrl}
              unoptimized
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--app-muted)]">Drawing image is unavailable.</p>
        )
      ) : (
        <p className="mt-3 text-lg font-medium leading-7">{entry.text}</p>
      )}
    </article>
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
      {!gameStarted ? (
        <TimerSettingsPanel code={code} isHost={isHost} lobby={lobby} playerToken={playerToken} />
      ) : null}
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

function TimerSettingsPanel({
  code,
  isHost,
  lobby,
  playerToken,
}: {
  code: string;
  isHost: boolean;
  lobby: Lobby;
  playerToken: string;
}) {
  const updateTimerSettings = useMutation(api.rooms.updateTimerSettings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const drawingSeconds = lobby.room.settings.drawingSeconds;
  const guessingSeconds = lobby.room.settings.guessingSeconds;

  async function handleTimerChange(kind: "drawing" | "guessing", value: string) {
    const seconds = Number(value);

    setError(null);
    setIsSaving(true);

    try {
      await updateTimerSettings({
        code,
        drawingSeconds: kind === "drawing" ? seconds : drawingSeconds,
        guessingSeconds: kind === "guessing" ? seconds : guessingSeconds,
        playerToken,
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not update timer settings."));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isHost) {
    return (
      <div className="grid gap-2 rounded-md bg-[var(--app-soft)] p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--app-muted)]">Drawing timer</span>
          <span className="font-medium">{timerOptionLabel(drawingSeconds)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--app-muted)]">Guess timer</span>
          <span className="font-medium">{timerOptionLabel(guessingSeconds)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md bg-[var(--app-soft)] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <TimerSelect
          disabled={isSaving}
          label="Drawing timer"
          onChange={(value) => handleTimerChange("drawing", value)}
          value={drawingSeconds}
        />
        <TimerSelect
          disabled={isSaving}
          label="Guess timer"
          onChange={(value) => handleTimerChange("guessing", value)}
          value={guessingSeconds}
        />
      </div>
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function TimerSelect({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium uppercase text-[var(--app-muted)]">
      {label}
      <select
        className="h-10 rounded-md border border-[var(--app-border)] bg-white px-3 text-sm font-medium normal-case text-[var(--app-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {TIMER_SECONDS.map((seconds) => (
          <option key={seconds} value={seconds}>
            {timerOptionLabel(seconds)}
          </option>
        ))}
      </select>
    </label>
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

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error("Could not prepare drawing image.");
  }

  return await response.blob();
}

function isStorageUploadResponse(value: unknown): value is { storageId: Id<"_storage"> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "storageId" in value &&
    isStorageId(value.storageId)
  );
}

function isStorageId(value: unknown): value is Id<"_storage"> {
  return typeof value === "string" && value.trim().length > 0;
}

function ErrorText({ message }: { message: string }) {
  return <p className="text-sm text-red-600">{message}</p>;
}

function errorMessage(error: unknown, fallback = "Could not join the room.") {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
