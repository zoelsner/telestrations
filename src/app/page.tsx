import { CheckCircle2, Clock3, Link2, Palette, Send, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Panel } from "@/components/ui";
import { CreateRoomForm } from "./create-room-form";
import { JoinRoomCodeForm } from "./join-room-code-form";

const flowSteps = [
  {
    icon: <Send size={18} />,
    label: "Prompt",
    text: "Start with player-written prompts or a safe pack.",
  },
  {
    icon: <Palette size={18} />,
    label: "Draw",
    text: "Each player sees only the prompt or guess before them.",
  },
  {
    icon: <Clock3 size={18} />,
    label: "Wait",
    text: "Submitted players see who is still working.",
  },
  {
    icon: <CheckCircle2 size={18} />,
    label: "Reveal",
    text: "Walk through the finished chains and export the archive.",
  },
];

export default function Home() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-[var(--app-border)] pb-5">
          <p className="text-sm font-medium text-[var(--app-muted)]">Team drawing game</p>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[var(--app-foreground)] sm:text-4xl">
                Telestrations
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
                Create a room, send the invite link, and play one focused turn at a time.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-[var(--app-border)] bg-white px-3 py-3 text-sm text-[var(--app-muted)] shadow-sm">
              <UsersRound size={18} />
              <span>Up to 15 players, no accounts required.</span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 py-4 sm:py-5 lg:grid-cols-2">
          <Panel className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Create a room</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
                  Start as host, then copy the room link for the team.
                </p>
              </div>
              <span className="rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
                Host
              </span>
            </div>
            <CreateRoomForm convexConfigured={convexConfigured} />
          </Panel>

          <Panel className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Join a room</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
                  Use the room code or paste the invite link from your host.
                </p>
              </div>
              <span className="rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
                Player
              </span>
            </div>
            <JoinRoomCodeForm />
          </Panel>
        </section>

        <section className="grid gap-3 border-t border-[var(--app-border)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step) => (
            <FlowStep icon={step.icon} key={step.label} label={step.label} text={step.text} />
          ))}
        </section>

        <section className="mt-auto grid gap-3 pt-5 text-sm text-[var(--app-muted)] sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-2">
            <Link2 size={16} />
            <span>Room links restore the same anonymous player slot on refresh.</span>
          </div>
          <span className="rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs">
            Work-safe prompt packs available
          </span>
        </section>
      </div>
    </main>
  );
}

function FlowStep({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return (
    <article className="rounded-md border border-[var(--app-border)] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--app-muted)]">
        {icon}
        <h2 className="text-sm font-semibold text-[var(--app-foreground)]">{label}</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{text}</p>
    </article>
  );
}
