import { Clock3, Palette, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { bootstrapStatus } from "@/domain/bootstrap-status";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--app-muted)]">Team game room</p>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--app-foreground)]">
              Telestrations
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-muted)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {bootstrapStatus.convex}
          </div>
        </header>

        <section className="grid flex-1 gap-4 py-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-[var(--app-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--app-foreground)]">Lobby</h2>
              <span className="rounded-md bg-[var(--app-soft)] px-2 py-1 text-xs text-[var(--app-muted)]">
                Setup
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">
                  Display name
                </span>
                <input
                  className="mt-2 h-10 w-full rounded-md border border-[var(--app-border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--app-accent)] focus:ring-4 focus:ring-[var(--app-accent-soft)]"
                  placeholder="Your name"
                />
              </label>

              <button className="flex h-10 w-full items-center justify-center rounded-md bg-[var(--app-foreground)] px-4 text-sm font-medium text-white transition hover:bg-black">
                Create room
              </button>
            </div>

            <div className="mt-6 space-y-3 border-t border-[var(--app-border)] pt-4">
              <StatRow icon={<UsersRound size={16} />} label="Room size" value="Up to 15" />
              <StatRow icon={<Clock3 size={16} />} label="Timer" value="60s-3m" />
              <StatRow icon={<Palette size={16} />} label="Drawing" value="Canvas ready" />
            </div>
          </aside>

          <section className="rounded-lg border border-[var(--app-border)] bg-white shadow-sm">
            <div className="border-b border-[var(--app-border)] px-5 py-4">
              <p className="text-sm font-medium text-[var(--app-muted)]">Build slice #1</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--app-foreground)]">
                Foundation is online
              </h2>
            </div>

            <div className="grid gap-0 md:grid-cols-3">
              {bootstrapStatus.items.map((item) => (
                <div
                  className="border-b border-[var(--app-border)] p-5 md:border-b-0 md:border-r last:md:border-r-0"
                  key={item.label}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-foreground)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-5">
              <div className="aspect-[4/3] w-full rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[linear-gradient(0deg,rgba(17,24,39,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.03)_1px,transparent_1px)] bg-[size:24px_24px] p-4">
                <div className="flex h-full items-center justify-center rounded-md bg-white/80 text-center">
                  <div>
                    <p className="text-sm font-medium text-[var(--app-foreground)]">
                      Drawing surface lands next
                    </p>
                    <p className="mt-1 text-sm text-[var(--app-muted)]">
                      Room flow, turn engine, and canvas work are split into focused issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
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
