import {
  Brush,
  CheckCircle2,
  Clock3,
  Copy,
  Eraser,
  Link2,
  Palette,
  Pencil,
  Redo2,
  Send,
  Settings2,
  Undo2,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button, IconButton, Panel, TextInput } from "@/components/ui";
import { activeTaskPreview } from "@/domain/active-task-preview";
import { CreateRoomForm } from "./create-room-form";

const players = [
  { name: "Maya", state: "Ready" },
  { name: "Drew", state: "Ready" },
  { name: "Nina", state: "Drawing" },
  { name: "Sam", state: "Ready" },
  { name: "Ari", state: "Waiting" },
  { name: "Jordan", state: "Ready" },
  { name: "Taylor", state: "Ready" },
  { name: "Lee", state: "Ready" },
  { name: "Chris", state: "Ready" },
  { name: "Morgan", state: "Ready" },
];

const swatches = [
  "#111827",
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#2563eb",
  "#7c3aed",
];

export default function Home() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--app-muted)]">Room F7K2</p>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--app-foreground)]">
              Telestrations
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-muted)] shadow-sm sm:max-w-none">
              <Link2 className="shrink-0" size={16} />
              <span className="truncate">draw.team/F7K2</span>
            </div>
            <Button className="w-full sm:w-auto">
              <Copy size={16} />
              Copy link
            </Button>
          </div>
        </header>

        <section className="grid flex-1 gap-4 py-4 sm:py-5 xl:grid-cols-[292px_minmax(0,1fr)_316px]">
          <Panel className="order-2 flex flex-col p-4 lg:order-1">
            <SectionHeader label="Lobby" meta={`${players.length}/15`} />

            <div className="mt-4 space-y-2">
              {players.map((player) => (
                <div
                  className="flex h-9 items-center justify-between rounded-md px-2 text-sm hover:bg-[var(--app-soft)]"
                  key={player.name}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        player.state === "Drawing" ? "bg-[var(--app-accent)]" : "bg-emerald-500"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{player.name}</span>
                  </div>
                  <span className="text-xs text-[var(--app-muted)]">{player.state}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-[var(--app-border)] pt-4">
              <SectionHeader label="Host controls" icon={<Settings2 size={16} />} />
              <div className="mt-3 grid gap-2">
                <SettingRow label="Prompts" value="Player-written" />
                <SettingRow label="Timer" value="90 seconds" />
                <SettingRow label="Theme" value="Work-safe mixed" />
                <SettingRow label="Turns" value="Auto" />
              </div>
            </div>
          </Panel>

          <Panel className="order-1 overflow-hidden lg:order-2">
            <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--app-muted)]">
                  Turn {activeTaskPreview.drawTask.currentTurn}
                </p>
                <h2 className="text-lg font-semibold sm:text-xl">
                  {activeTaskPreview.drawTask.title}
                </h2>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Timer value={activeTaskPreview.drawTask.timer} />
                <Button className="flex-1 sm:flex-none" variant="primary">
                  <Send size={16} />
                  Submit
                </Button>
              </div>
            </div>

            <div className="border-b border-[var(--app-border)] bg-[var(--app-soft)] px-4 py-3">
              <p className="text-xs font-medium uppercase text-[var(--app-muted)]">
                {activeTaskPreview.drawTask.visibleEntry.label}
              </p>
              <p className="mt-1 text-base font-medium">
                {activeTaskPreview.drawTask.visibleEntry.value}
              </p>
            </div>

            <div className="p-3 sm:p-4">
              <DrawingToolbar />
              <DrawingCanvas />
            </div>
          </Panel>

          <div className="order-3 grid gap-4">
            <Panel className="p-4">
              <SectionHeader label="Create room" meta="Live" />
              <CreateRoomForm convexConfigured={convexConfigured} />
            </Panel>

            <Panel className="p-4">
              <SectionHeader
                label="Guess state"
                meta={`Turn ${activeTaskPreview.guessTask.currentTurn}`}
              />
              <div className="mt-4 rounded-lg border border-[var(--app-border)] bg-white p-3">
                <p className="text-xs font-medium uppercase text-[var(--app-muted)]">
                  {activeTaskPreview.guessTask.visibleEntry.label}
                </p>
                <SketchPreview />
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase text-[var(--app-muted)]">
                  Your guess
                </span>
                <TextInput className="mt-2" placeholder="Type what you see" />
              </label>
              <Button className="mt-3 w-full" variant="primary">
                <Send size={16} />
                Submit guess
              </Button>
            </Panel>

            <Panel className="p-4">
              <SectionHeader label="Round status" meta="Live" />
              <div className="mt-4 space-y-3">
                <StatRow icon={<CheckCircle2 size={16} />} label="Submitted" value="7" />
                <StatRow icon={<Clock3 size={16} />} label="Pending" value="3" />
                <StatRow icon={<UsersRound size={16} />} label="Players" value="10" />
                <StatRow icon={<Palette size={16} />} label="Task" value="Draw" />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function DrawingToolbar() {
  return (
    <div
      className="mb-3 flex flex-col gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-soft)] p-2 sm:flex-row sm:items-center sm:justify-between"
      data-testid="drawing-toolbar"
    >
      <div className="flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
        <IconButton label="Brush">
          <Brush size={17} />
        </IconButton>
        <IconButton label="Undo">
          <Undo2 size={17} />
        </IconButton>
        <IconButton label="Redo">
          <Redo2 size={17} />
        </IconButton>
        <IconButton label="Clear">
          <Eraser size={17} />
        </IconButton>
      </div>
      <div className="flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
        {swatches.map((color) => (
          <button
            aria-label={`Use ${color}`}
            className="h-10 w-10 shrink-0 rounded-full border border-black/10 ring-offset-2 transition focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] sm:h-7 sm:w-7"
            key={color}
            style={{ backgroundColor: color }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function DrawingCanvas() {
  return (
    <div
      aria-label="Drawing canvas"
      className="aspect-[4/3] min-h-[min(64svh,360px)] w-full touch-none select-none overscroll-contain rounded-lg border border-[var(--app-border-strong)] bg-[var(--paper)] p-2 shadow-inner sm:min-h-[360px] sm:p-4"
      data-testid="drawing-canvas"
      role="img"
    >
      <div className="relative h-full min-h-[220px] touch-none overflow-hidden rounded-md bg-[linear-gradient(0deg,rgba(17,24,39,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.035)_1px,transparent_1px)] bg-[size:24px_24px] sm:min-h-0">
        <div className="absolute left-[20%] top-[23%] h-24 w-32 rounded-lg border-4 border-[var(--ink)] bg-white" />
        <div className="absolute left-[24%] top-[33%] grid h-11 w-24 grid-cols-3 gap-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <span className="rounded-sm bg-[var(--app-soft)]" key={index} />
          ))}
        </div>
        <div className="absolute left-[54%] top-[24%] h-20 w-20 rounded-full border-4 border-[var(--app-accent)]" />
        <div className="absolute left-[60%] top-[40%] h-28 w-1 -rotate-12 rounded-full bg-[var(--ink)]" />
        <div className="absolute left-[50%] top-[54%] h-1 w-40 -rotate-6 rounded-full bg-[var(--ink)]" />
        <Pencil className="absolute bottom-5 right-5 h-8 w-8 text-[var(--app-accent)] sm:bottom-8 sm:right-8 sm:h-10 sm:w-10" />
      </div>
    </div>
  );
}

function SketchPreview() {
  return (
    <div className="mt-3 aspect-[4/3] rounded-md border border-[var(--app-border)] bg-[var(--paper)] p-3">
      <div className="relative h-full overflow-hidden rounded bg-white">
        <div className="absolute left-[18%] top-[20%] h-14 w-20 rounded border-2 border-[var(--ink)]" />
        <div className="absolute left-[52%] top-[18%] h-12 w-12 rounded-full border-2 border-[var(--app-accent)]" />
        <div className="absolute left-[36%] top-[52%] h-1 w-24 rotate-6 rounded bg-[var(--ink)]" />
        <div className="absolute left-[66%] top-[49%] h-14 w-1 -rotate-12 rounded bg-[var(--ink)]" />
      </div>
    </div>
  );
}

function Timer({ value }: { value: string }) {
  return (
    <div className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--app-border)] bg-white px-3 text-sm font-medium sm:h-10">
      <Clock3 size={16} className="text-[var(--app-muted)]" />
      <span>{value}</span>
    </div>
  );
}

function SectionHeader({ icon, label, meta }: { icon?: ReactNode; label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-[var(--app-muted)]">{icon}</span> : null}
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      {meta ? (
        <span className="rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 rounded-md bg-[var(--app-soft)] px-3 text-sm">
      <span className="text-[var(--app-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-[var(--app-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-[var(--app-foreground)]">{value}</span>
    </div>
  );
}
