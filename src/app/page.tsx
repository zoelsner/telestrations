import { Link2, UsersRound } from "lucide-react";

import { Panel } from "@/components/ui";
import { CreateRoomForm } from "./create-room-form";
import { JoinRoomCodeForm } from "./join-room-code-form";

const flowSteps = [
  {
    color: "var(--app-accent)",
    label: "Prompt",
    text: "Start with player-written prompts or a safe pack.",
  },
  {
    color: "var(--app-gold)",
    label: "Draw",
    text: "Each player sees only the prompt or guess before them.",
  },
  {
    color: "var(--app-teal)",
    label: "Wait",
    text: "Submitted players see who is still working.",
  },
  {
    color: "var(--app-green)",
    label: "Reveal",
    text: "Walk through the finished chains and export the archive.",
  },
];

export default function Home() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-svh bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="safe-page-bottom mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="relative border-b border-[var(--app-divider)] pb-5">
          <BobbingArcs />
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--app-accent)]">
            Team drawing game
          </p>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="font-display text-4xl tracking-normal text-[var(--app-foreground)] sm:text-[44px] sm:leading-none">
                Pass the Doodle
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--app-muted-strong)]">
                Create a room, send the invite link, and play one focused turn at a time.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-[var(--app-border)] bg-white px-3 py-3 text-sm text-[var(--app-muted)]">
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
              <span className="shrink-0 rounded-full border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-cream-text)]">
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
              <span className="shrink-0 rounded-full border-[1.5px] border-[var(--app-blue-border)] bg-[var(--app-blue-soft)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--app-teal)]">
                Player
              </span>
            </div>
            <JoinRoomCodeForm />
          </Panel>
        </section>

        <section className="grid gap-3 border-t border-[var(--app-divider)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step) => (
            <FlowStep color={step.color} key={step.label} label={step.label} text={step.text} />
          ))}
        </section>

        <section className="mt-auto grid gap-3 pt-5 text-sm text-[var(--app-muted)] sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-2">
            <Link2 size={16} />
            <span>Room links restore the same anonymous player slot on refresh.</span>
          </div>
          <span className="rounded-full border-[1.5px] border-[var(--app-cream-border)] bg-[var(--app-cream)] px-2.5 py-1 text-xs font-semibold text-[var(--app-cream-text)]">
            Work-safe prompt packs available
          </span>
        </section>
      </div>
    </main>
  );
}

function BobbingArcs() {
  return (
    <div aria-hidden="true" className="absolute right-0 top-1 hidden items-end gap-2.5 sm:flex">
      <span
        className="animate-bob h-[27px] w-[54px] rounded-t-full border-[2.5px] border-[var(--app-ink)] bg-[var(--app-accent)] shadow-[3px_3px_0_0_var(--app-ink)]"
        style={{ "--bob-rotate": "-12deg", animationDuration: "5s" } as React.CSSProperties}
      />
      <span
        className="animate-bob h-[19px] w-[38px] rounded-t-full border-[2.5px] border-[var(--app-ink)] bg-[var(--app-gold)] shadow-[3px_3px_0_0_var(--app-ink)]"
        style={
          {
            "--bob-rotate": "8deg",
            animationDelay: "0.6s",
            animationDuration: "6s",
          } as React.CSSProperties
        }
      />
      <span
        className="animate-bob h-[13px] w-[26px] rounded-t-full border-[2.5px] border-[var(--app-ink)] bg-[var(--app-cream)] shadow-[3px_3px_0_0_var(--app-ink)]"
        style={
          {
            "--bob-rotate": "20deg",
            animationDelay: "1.1s",
            animationDuration: "7s",
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function FlowStep({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <article className="rounded-xl border-[1.5px] border-[var(--app-border)] bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-[13px] w-[26px] shrink-0 rounded-t-full"
          style={{ backgroundColor: color }}
        />
        <h2 className="text-[13px] font-bold text-[var(--app-foreground)]">{label}</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{text}</p>
    </article>
  );
}
