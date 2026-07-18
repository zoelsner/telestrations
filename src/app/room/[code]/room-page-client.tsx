"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Download,
  DoorOpen,
  Image as ImageIcon,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Send,
  SkipForward,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { errorMessage } from "@/app/lib/error-message";
import { DrawingBoard, type DrawingBoardValue } from "@/components/drawing-board";
import { Button, IconButton, Panel, TextInput } from "@/components/ui";
import { buildActiveTaskView, type ActiveTaskPreviousEntry } from "@/domain/active-task";
import { CANVAS_SIZE, DRAWING_BACKGROUND_COLOR } from "@/domain/drawing";
import { HEARTBEAT_INTERVAL_MS, isPlayerDisconnected } from "@/domain/presence";
import { buildRevealView } from "@/domain/reveal";
import { normalizeRoomCode, validateDisplayName } from "@/domain/room-join";
import { getStartGameGate } from "@/domain/start-game";
import { MAX_DRAWING_ARTIFACT_BYTES } from "@/domain/submission";
import { TIMER_SECONDS, getTurnTimerState } from "@/domain/timer";
import { getOrCreatePlayerToken } from "../../room-session";
import { downloadRevealPdf } from "./pdf-export";

const PLAYER_COLORS = [
  "var(--app-accent)",
  "var(--app-gold)",
  "var(--app-teal)",
  "var(--app-plum)",
  "var(--app-green)",
];

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

  return (
    <Suspense fallback={null}>
      <RoomPageLive code={normalizedCode} />
    </Suspense>
  );
}

function RoomPageLive({ code }: { code: string }) {
  const playerToken = usePlayerToken(code);
  const claim = useRejoinClaim({ code, playerToken });
  const isClaiming = claim.status === "claiming";

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
    (lobby.room.status === "reveal" || lobby.room.status === "archived");
  const focusRoom = showActiveTask || showReveal;
  const heartbeatEnabled =
    lobby !== undefined &&
    lobby !== null &&
    lobby.currentPlayer != null &&
    (lobby.room.status === "setup" ||
      lobby.room.status === "lobby" ||
      lobby.room.status === "active");
  usePresenceHeartbeat({ code, playerToken, enabled: heartbeatEnabled });

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[var(--app-divider)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
              Room {code}
            </p>
            <h1 className="font-display text-2xl text-[var(--app-foreground)] sm:text-[28px]">
              Pass the Doodle
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <RoomInviteControls code={code} />
              <Link
                className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--app-soft)] sm:h-10 sm:w-auto"
                href="/"
              >
                Back to app
              </Link>
            </div>
            {lobby !== undefined && lobby !== null && lobby.currentPlayer ? (
              <p className="text-xs leading-5 text-[var(--app-muted)]">
                Rejoin from this browser with the same room link.
              </p>
            ) : null}
          </div>
        </header>

        <RejoinClaimBanner error={claim.error} status={claim.status} />

        <section
          className={
            focusRoom
              ? "flex flex-1 py-4 sm:py-5"
              : "grid flex-1 gap-4 py-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          }
        >
          <Panel
            className={`order-1 ${showActiveTask || showReveal ? "flex-1 overflow-hidden" : "p-4"}`}
          >
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
              <LobbyView code={code} lobby={lobby} playerToken={playerToken} />
            )}
          </Panel>

          {!focusRoom ? (
            <div className="order-2 grid content-start gap-4">
              <Panel className="p-4">
                {lobby === undefined || playerToken === null ? (
                  <LoadingRoom />
                ) : lobby === null ? (
                  <MissingRoom code={code} />
                ) : lobby.currentPlayer ? (
                  <PlayerStatus code={code} lobby={lobby} playerToken={playerToken} />
                ) : isClaiming ? (
                  <LoadingRoom />
                ) : lobby.room.status === "active" ? (
                  <ReclaimSeatPanel code={code} lobby={lobby} playerToken={playerToken} />
                ) : (
                  <JoinRoomForm code={code} playerToken={playerToken} />
                )}
              </Panel>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function RoomInviteControls({ code }: { code: string }) {
  const sharePath = `/room/${code}`;
  const [copied, setCopied] = useState(false);

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="inline-flex h-11 min-w-0 items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium text-[var(--app-muted)] shadow-sm sm:h-10">
        <Link2 className="shrink-0" size={16} />
        <span className="truncate">{sharePath}</span>
      </div>
      <Button className="w-full sm:w-auto" onClick={handleCopyInvite} variant="primary">
        <Copy size={16} />
        {copied ? "Copied" : "Copy invite link"}
      </Button>
    </div>
  );
}

function usePlayerToken(code: string) {
  return useSyncExternalStore(
    emptySubscribe,
    () => getOrCreatePlayerToken(code),
    () => null,
  );
}

function usePresenceHeartbeat({
  code,
  enabled,
  playerToken,
}: {
  code: string;
  enabled: boolean;
  playerToken: string | null;
}) {
  const heartbeat = useMutation(api.rooms.heartbeat);

  useEffect(() => {
    if (!enabled || playerToken === null) {
      return;
    }

    const sendHeartbeat = () => {
      heartbeat({ code, playerToken }).catch(() => {});
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, enabled, heartbeat, playerToken]);
}

function emptySubscribe() {
  return () => {};
}

type RejoinClaimStatus = "idle" | "claiming" | "error";

function useRejoinClaim({ code, playerToken }: { code: string; playerToken: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimSeat = useMutation(api.rooms.claimSeat);
  const rejoinSecret = searchParams.get("rejoin");
  const [status, setStatus] = useState<RejoinClaimStatus>(rejoinSecret ? "claiming" : "idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedSecretRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rejoinSecret || playerToken === null) {
      return;
    }

    if (attemptedSecretRef.current === rejoinSecret) {
      return;
    }

    attemptedSecretRef.current = rejoinSecret;
    setStatus("claiming");
    setError(null);

    let cancelled = false;

    claimSeat({ code, playerToken, rejoinSecret })
      .then(() => {
        if (!cancelled) {
          setStatus("idle");
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(errorMessage(caughtError, "This rejoin link is no longer valid."));
          setStatus("error");
        }
      })
      .finally(() => {
        // Strip the secret from the URL so a refresh cannot replay it and so the
        // now-bound local token drives every query normally.
        router.replace(`/room/${code}`);
      });

    return () => {
      cancelled = true;
    };
  }, [claimSeat, code, playerToken, rejoinSecret, router]);

  return { error, status };
}

function RejoinClaimBanner({ error, status }: { error: string | null; status: RejoinClaimStatus }) {
  if (status === "claiming") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] px-4 py-3 text-sm text-[var(--app-cream-text)]">
        <Loader2 className="animate-spin" size={16} />
        Rejoining your seat…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="mt-4 flex items-start gap-2 rounded-[10px] border-[1.5px] border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        <AlertCircle className="mt-0.5 shrink-0" size={16} />
        <span>
          {error ?? "This rejoin link is no longer valid."} Ask the host for a fresh link, or join
          below.
        </span>
      </div>
    );
  }

  return null;
}

function RejoinLinkButton({
  code,
  displayName,
  playerToken,
  targetPlayerId,
}: {
  code: string;
  displayName: string;
  playerToken: string;
  targetPlayerId: Id<"players">;
}) {
  const issueRejoinLink = useMutation(api.rooms.issueRejoinLink);
  const [copied, setCopied] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    if (isIssuing) {
      return;
    }

    setError(null);
    setIsIssuing(true);

    try {
      const result = await issueRejoinLink({ code, playerToken, targetPlayerId });
      await navigator.clipboard.writeText(
        `${window.location.origin}/room/${code}?rejoin=${result.rejoinSecret}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not create a rejoin link."));
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
      <IconButton
        disabled={isIssuing}
        label={`Copy rejoin link for ${displayName}`}
        onClick={handleCopy}
      >
        {isIssuing ? (
          <Loader2 className="animate-spin" size={16} />
        ) : copied ? (
          <Check size={16} />
        ) : (
          <Link2 size={16} />
        )}
      </IconButton>
    </span>
  );
}

function LobbyView({
  code,
  compact = false,
  lobby,
  playerToken,
}: {
  code: string;
  compact?: boolean;
  lobby: Lobby;
  playerToken: string | null;
}) {
  const canIssueRejoin = lobby.currentPlayer?.isHost === true && playerToken !== null;
  const now = useNow(1_000);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={compact ? "text-sm font-semibold" : "text-xl font-semibold"}>Lobby</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            {lobby.room.playerCount}/{lobby.room.maxPlayers} players joined
          </p>
        </div>
        <span
          className={`w-fit rounded-full border-[1.5px] px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider ${
            lobby.room.status === "lobby"
              ? "border-[var(--app-green-border)] bg-[var(--app-green-soft)] text-[var(--app-green)]"
              : "border-[var(--app-cream-border)] bg-[var(--app-cream)] text-[var(--app-cream-text)]"
          }`}
        >
          {lobby.room.status}
        </span>
      </div>

      <div className={`${compact ? "mt-4" : "mt-5"} grid gap-2`}>
        {lobby.players.map((player) => {
          const isDisconnected =
            player.status !== "removed" &&
            player.lastSeenAt != null &&
            isPlayerDisconnected({ lastSeenAt: player.lastSeenAt, now });

          return (
            <div
              className={`flex min-h-12 items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-sm sm:min-h-11 sm:py-0 ${
                player.isCurrentPlayer
                  ? "border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)]"
                  : "border-[1.5px] border-[var(--app-divider)] bg-white"
              }`}
              key={player.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="mb-1 h-4 w-8 shrink-0 self-end rounded-t-full"
                  style={{ backgroundColor: PLAYER_COLORS[player.order % PLAYER_COLORS.length] }}
                />
                <span className="truncate font-medium">{player.displayName}</span>
                {player.isCurrentPlayer ? (
                  <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-wide text-[var(--app-faint)]">
                    You
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canIssueRejoin && playerToken !== null && !player.isHost ? (
                  <RejoinLinkButton
                    code={code}
                    displayName={player.displayName}
                    playerToken={playerToken}
                    targetPlayerId={player.id}
                  />
                ) : null}
                <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  {player.isHost ? (
                    <>
                      <Crown className="text-[var(--app-gold)]" size={14} />
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--app-cream-text)]">
                        Host
                      </span>
                    </>
                  ) : isDisconnected ? (
                    <span className="rounded-full border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--app-cream-text)]">
                      Offline
                    </span>
                  ) : (
                    <>
                      <UserRound size={14} />
                      <span className="text-xs text-[var(--app-faint)]">{player.status}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
      <div className="flex flex-col gap-3 border-b border-[var(--app-divider)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)]">
            <span className="text-[8.5px] font-bold tracking-wide text-[var(--app-cream-text)]">
              TURN
            </span>
            <span className="font-display text-xl leading-none text-[var(--app-foreground)]">
              {taskView.currentTurn}
            </span>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
              Turn {taskView.currentTurn}
            </p>
            <h2 className="font-display text-2xl text-[var(--app-foreground)] sm:text-[26px]">
              {taskView.title}
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <TurnTimer deadlineAt={activeTask.room.activeDeadlineAt} />
          <RoundProgress round={activeTask.round} />
        </div>
      </div>

      {taskView.state === "compose" ? (
        <div className="grid min-w-0 flex-1 content-start gap-4 p-4">
          {"previousEntry" in taskView && taskView.previousEntry ? (
            <PreviousEntry entry={taskView.previousEntry} />
          ) : taskView.entryType === "prompt" ? (
            <div className="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] px-4 py-3 text-sm text-[var(--app-cream-text)]">
              <span
                aria-hidden
                className="h-[11px] w-[22px] shrink-0 rounded-t-full bg-[var(--app-accent)]"
              />
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
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-muted)]">
          {inputLabel}
        </span>
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
      {entryType === "guess" ? (
        <p className="rounded-[10px] border-[1.5px] border-dashed border-[var(--app-cream-border)] px-4 py-3 text-xs leading-6 text-[var(--app-muted)]">
          Only you can see this drawing. Your guess becomes the next player&apos;s prompt.
        </p>
      ) : null}
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

    if (drawing.exportStatus.byteSize > MAX_DRAWING_ARTIFACT_BYTES) {
      setError("This drawing is too large to submit. Try simplifying it.");
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
    <form className="grid min-w-0 gap-3" onSubmit={handleSubmit}>
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
  if (entry.kind === "drawing") {
    return (
      <section className="border-b border-[var(--app-divider)] bg-[var(--app-panel)] px-4 py-3 -mx-4 -mt-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--app-faint)]">
          <ImageIcon size={14} />
          <span>
            {entry.label} · Turn {entry.turn}
          </span>
        </div>
        <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-[var(--paper)]">
          <Image
            alt="Previous drawing"
            className="object-contain"
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            src={entry.imageUrl}
            unoptimized
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex items-center gap-2.5 border-b border-[var(--app-cream-border)] bg-[var(--app-cream)] px-4 py-3 -mx-4 -mt-4">
      <div className="w-full">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-[11px] w-[22px] shrink-0 rounded-t-full bg-[var(--app-gold)]"
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
            {entry.label} · Turn {entry.turn}
          </span>
        </div>
        <p className="mt-2 font-display text-lg leading-7 text-[var(--app-foreground)]">
          {entry.value}
        </p>
      </div>
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
        <span className="mx-auto flex h-14 w-14 shrink-0 items-end justify-center rounded-[14px] border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] pb-2.5 sm:mx-0">
          <span className="flex gap-1">
            <span
              className="h-2 w-2 rounded-full bg-[var(--app-accent)] animate-blinkdot"
              style={{ animationDelay: "0s" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-[var(--app-gold)] animate-blinkdot"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-[var(--app-teal)] animate-blinkdot"
              style={{ animationDelay: "0.4s" }}
            />
          </span>
        </span>
        <div>
          <h2 className="font-display text-2xl text-[var(--app-foreground)]">
            You&apos;re in — {round.pendingCount} to go
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Stretch your drawing hand. The round moves when everyone submits.
          </p>
        </div>
      </div>

      <section className="grid gap-2" aria-label="Turn status">
        {round.players.map((player) => {
          const isPending = player.assignmentStatus === "pending";
          const isSkipping = skippingAssignmentId === player.assignmentId;

          return (
            <div
              className={`flex min-h-12 flex-col justify-between gap-3 rounded-[10px] border-[1.5px] px-3 py-3 text-sm sm:flex-row sm:items-center ${
                isPending
                  ? "border-[var(--app-cream-border)] bg-[var(--app-cream)]"
                  : "border-[var(--app-divider)] bg-white"
              }`}
              key={player.assignmentId}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isPending
                      ? "border-[1.5px] border-[var(--app-cream-border)] bg-white text-[var(--app-cream-text)]"
                      : "bg-[var(--app-green)] text-[var(--app-cream)]"
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
                  <p
                    className={
                      isPending
                        ? "text-xs capitalize text-[var(--app-muted)]"
                        : "text-[10.5px] font-bold uppercase tracking-wide text-[var(--app-green)]"
                    }
                  >
                    {player.assignmentStatus}
                    {player.playerStatus !== "connected" ? ` · ${player.playerStatus}` : ""}
                    {player.isHost ? " · Host" : ""}
                  </p>
                </div>
              </div>

              {canRecover && (!player.isHost || isPending) ? (
                <div className="flex items-center justify-end gap-2">
                  {!player.isHost ? (
                    <RejoinLinkButton
                      code={code}
                      displayName={player.displayName}
                      playerToken={playerToken}
                      targetPlayerId={player.playerId}
                    />
                  ) : null}
                  {isPending ? (
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
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] text-[var(--app-cream-text)]">
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

  const isUrgent =
    timerState.state === "expired" ||
    (timerState.state === "running" && timerState.remainingSeconds <= 20);

  return (
    <div
      className={`inline-flex h-10 items-center gap-2 rounded-[10px] border-[1.5px] px-3 font-mono text-[15px] font-bold ${
        isUrgent
          ? "border-transparent bg-[var(--app-accent)] text-[var(--app-cream)]"
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
    <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white text-center text-xs">
      <RoundProgressCell
        label="Done"
        value={round.completedCount}
        valueClassName="text-[var(--app-green)]"
      />
      <RoundProgressCell
        label="Pending"
        value={round.pendingCount}
        valueClassName="text-[var(--app-accent)]"
      />
      <RoundProgressCell
        label="Total"
        value={round.totalCount}
        valueClassName="text-[var(--app-foreground)]"
      />
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

function promptModeLabel(mode: "player-written" | "safe-pack") {
  return mode === "safe-pack" ? "App prompt pack" : "Players write prompts";
}

function promptPackLabel(
  options: Lobby["room"]["settings"]["promptPackOptions"],
  promptPackId: string,
) {
  return options.find((option) => option.id === promptPackId)?.label ?? "Mixed";
}

function RoundProgressCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <div className="min-w-16 border-r border-[var(--app-divider)] px-3 py-2 last:border-r-0">
      <div className={`font-semibold ${valueClassName}`}>{value}</div>
      <div className="text-[var(--app-muted)]">{label}</div>
    </div>
  );
}

function RevealSurface({ code, reveal }: { code: string; reveal: Reveal | null }) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
  const revealForExport = reveal;

  function selectByOffset(offset: number) {
    const nextItem = revealView.overview[revealView.currentIndex + offset];

    if (nextItem) {
      setSelectedChainId(nextItem.id);
    }
  }

  async function handleExportPdf() {
    if (isExportingPdf) {
      return;
    }

    setExportError(null);
    setIsExportingPdf(true);

    try {
      await downloadRevealPdf(revealForExport);
    } catch (caughtError) {
      setExportError(errorMessage(caughtError, "Could not export this PDF."));
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-[var(--app-divider)] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
            Room {reveal.room.code} · the big finish
          </p>
          <h2 className="font-display text-2xl text-[var(--app-foreground)] sm:text-[28px]">
            Final reveal
          </h2>
          {exportError ? <ErrorText message={exportError} /> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {reveal.currentPlayer?.isHost === true ? (
            <Button disabled={isExportingPdf} onClick={handleExportPdf}>
              {isExportingPdf ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              Export PDF
            </Button>
          ) : null}
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
            variant="primary"
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
              className={`min-h-12 rounded-[10px] border-[1.5px] px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)] ${
                item.isSelected
                  ? "border-transparent bg-[var(--app-ink)] text-[var(--app-cream)]"
                  : "border-[var(--app-divider)] bg-white text-[var(--app-foreground)] hover:bg-[var(--app-soft)]"
              }`}
              key={item.id}
              onClick={() => setSelectedChainId(item.id)}
              type="button"
            >
              <span className="block font-medium">{item.label}</span>
              <span
                className={`block truncate text-xs ${
                  item.isSelected ? "text-[color:#a8b0c4]" : "text-[var(--app-muted)]"
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
                <h3 className="font-display text-xl text-[var(--app-foreground)]">
                  {selectedChain.label}
                </h3>
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
    <article className="rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-[0_1px_2px_rgba(26,37,64,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-faint)]">
        <span>
          Turn {entry.turn} · {entry.type}
        </span>
        <span>{entry.authorName}</span>
      </div>

      {entry.type === "drawing" && "skipped" in entry ? (
        <p className="mt-3 font-display text-lg leading-7 text-[var(--app-foreground)]">
          {entry.text}
        </p>
      ) : entry.type === "drawing" ? (
        entry.imageUrl ? (
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-[var(--paper)]">
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
        <p className="mt-3 font-display text-lg leading-7 text-[var(--app-foreground)]">
          {entry.text}
        </p>
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
      setError(errorMessage(caughtError, "Could not join the room."));
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

function ReclaimSeatPanel({
  code,
  lobby,
  playerToken,
}: {
  code: string;
  lobby: Lobby;
  playerToken: string;
}) {
  const now = useNow(1_000);
  const reclaimSeat = useMutation(api.rooms.reclaimSeat);
  const [pendingId, setPendingId] = useState<Id<"players"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const claimable = lobby.players.filter(
    (player) =>
      player.status !== "removed" &&
      !player.isHost &&
      isPlayerDisconnected({ lastSeenAt: player.lastSeenAt, now }),
  );

  async function handleReclaim(player: Lobby["players"][number]) {
    if (pendingId !== null) {
      return;
    }

    setError(null);
    setPendingId(player.id);

    try {
      await reclaimSeat({ code, playerToken, targetPlayerId: player.id });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not reclaim that seat."));
      setPendingId(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-sm font-semibold">Were you already playing?</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Pick your seat to jump back into the game.
        </p>
      </div>
      {claimable.length === 0 ? (
        <p className="text-sm text-[var(--app-muted)]">
          No seats are open to reclaim right now. If your seat still shows as active, give it a few
          seconds — or ask the host for a rejoin link.
        </p>
      ) : (
        <div className="grid gap-2">
          {claimable.map((player) => {
            const isPending = pendingId === player.id;

            return (
              <Button
                aria-label={`Reclaim ${player.displayName}'s seat`}
                className="w-full"
                disabled={pendingId !== null}
                key={player.id}
                onClick={() => handleReclaim(player)}
              >
                {isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <DoorOpen size={16} />
                )}
                {player.displayName}
              </Button>
            );
          })}
        </div>
      )}
      {error ? <ErrorText message={error} /> : null}
    </div>
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
      setError(errorMessage(caughtError, "Could not start the game."));
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
        <>
          <PromptSettingsPanel
            code={code}
            isHost={isHost}
            lobby={lobby}
            playerToken={playerToken}
          />
          <TimerSettingsPanel code={code} isHost={isHost} lobby={lobby} playerToken={playerToken} />
        </>
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

function PromptSettingsPanel({
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
  const updatePromptSettings = useMutation(api.rooms.updatePromptSettings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const promptMode =
    lobby.room.settings.promptMode === "safe-pack" ? "safe-pack" : "player-written";
  const promptPackOptions = lobby.room.settings.promptPackOptions;
  const selectedPromptPackId = lobby.room.settings.promptPackId;
  const promptPackId =
    selectedPromptPackId && promptPackOptions.some((option) => option.id === selectedPromptPackId)
      ? selectedPromptPackId
      : "mixed";

  async function savePromptSettings({
    nextPromptMode,
    nextPromptPackId,
  }: {
    nextPromptMode: "player-written" | "safe-pack";
    nextPromptPackId: string;
  }) {
    setError(null);
    setIsSaving(true);

    try {
      await updatePromptSettings({
        code,
        playerToken,
        promptMode: nextPromptMode,
        ...(nextPromptMode === "safe-pack" ? { promptPackId: nextPromptPackId } : {}),
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not update prompt settings."));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isHost) {
    return (
      <div className="grid gap-2 rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-3.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
            Prompt source
          </span>
          <span className="text-right font-medium">{promptModeLabel(promptMode)}</span>
        </div>
        {promptMode === "safe-pack" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
              Prompt theme
            </span>
            <span className="text-right font-medium">
              {promptPackLabel(promptPackOptions, promptPackId)}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-3.5">
      <PromptModeSelect
        disabled={isSaving}
        onChange={(nextPromptMode) =>
          savePromptSettings({
            nextPromptMode,
            nextPromptPackId: promptPackId,
          })
        }
        value={promptMode}
      />
      {promptMode === "safe-pack" ? (
        <PromptPackSelect
          disabled={isSaving}
          onChange={(nextPromptPackId) =>
            savePromptSettings({
              nextPromptMode: promptMode,
              nextPromptPackId,
            })
          }
          options={promptPackOptions}
          value={promptPackId}
        />
      ) : null}
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function PromptModeSelect({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: "player-written" | "safe-pack") => void;
  value: "player-written" | "safe-pack";
}) {
  return (
    <label className="grid gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
      Prompt source
      <select
        className="h-10 rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium normal-case text-[var(--app-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)]"
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === "safe-pack" ? "safe-pack" : "player-written")
        }
        value={value}
      >
        <option value="player-written">{promptModeLabel("player-written")}</option>
        <option value="safe-pack">{promptModeLabel("safe-pack")}</option>
      </select>
    </label>
  );
}

function PromptPackSelect({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  options: Lobby["room"]["settings"]["promptPackOptions"];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
      Prompt theme
      <select
        className="h-10 rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium normal-case text-[var(--app-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
      <div className="grid gap-2 rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-3.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-teal)]">
            Drawing timer
          </span>
          <span className="font-medium">{timerOptionLabel(drawingSeconds)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-teal)]">
            Guess timer
          </span>
          <span className="font-medium">{timerOptionLabel(guessingSeconds)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-3.5">
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
    <label className="grid gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-teal)]">
      {label}
      <select
        className="h-10 rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium normal-case text-[var(--app-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)]"
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
      <h2 className="font-display text-xl text-[var(--app-foreground)]">Room not found</h2>
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
        <header className="border-b border-[var(--app-divider)] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
            Room {code}
          </p>
          <h1 className="font-display text-2xl text-[var(--app-foreground)] sm:text-[28px]">
            Pass the Doodle
          </h1>
        </header>
        <Panel className="mt-5 p-4">
          <h2 className="text-xl font-semibold">Live rooms are unavailable</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Convex is not configured for this environment.
          </p>
          <Link
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--app-soft)] sm:h-10 sm:w-auto"
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
