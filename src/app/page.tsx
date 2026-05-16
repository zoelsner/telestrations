import {
  CheckCircle2,
  Clock3,
  Copy,
  Link2,
  Palette,
  Send,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { DrawingBoard } from "@/components/drawing-board";
import { Button, Panel, TextInput } from "@/components/ui";
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
              <DrawingBoard />
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
