import { describe, expect, it } from "vitest";

import { buildArchiveManifest } from "./archive-export";

describe("archive export manifest", () => {
  it("builds a stable filename and sorted chain sections", () => {
    const manifest = buildArchiveManifest({
      chains: [
        {
          entries: [
            {
              authorName: "Riley",
              text: "A standup under the sea",
              turn: 2,
              type: "guess",
            },
            {
              authorName: "Jordan",
              imageUrl: "https://example.test/drawing.png",
              turn: 1,
              type: "drawing",
            },
          ],
          order: 1,
          ownerName: "Jordan",
        },
        {
          entries: [
            {
              authorName: "Maya",
              text: "A roadmap on a skateboard",
              turn: 0,
              type: "prompt",
            },
          ],
          order: 0,
          ownerName: "Maya",
        },
      ],
      generatedAt: Date.UTC(2026, 4, 16, 20, 0, 0),
      players: [
        { displayName: "Maya", isHost: true, order: 0 },
        { displayName: "Jordan", isHost: false, order: 1 },
      ],
      room: {
        code: "ab12",
        settings: {
          drawingSeconds: 90,
          guessingSeconds: 60,
          promptMode: "player-written",
        },
      },
    });

    expect(manifest.title).toBe("Pass the Doodle AB12");
    expect(manifest.fileName).toBe("telestrations-AB12-2026-05-16.pdf");
    expect(manifest.summaryLines).toEqual([
      "Generated May 16, 2026",
      "Players: Maya (host), Jordan",
      "Prompts: Players write prompts",
      "Timers: Drawing 90s, guessing 60s",
    ]);
    expect(manifest.chains.map((chain) => chain.label)).toEqual(["Chain 1", "Chain 2"]);
    expect(manifest.chains[0]?.entries.map((entry) => entry.label)).toEqual(["Turn 0 · Prompt"]);
    expect(manifest.chains[1]?.entries.map((entry) => entry.label)).toEqual([
      "Turn 1 · Drawing",
      "Turn 2 · Guess",
    ]);
  });

  it("labels safe prompt packs and skipped drawings", () => {
    const manifest = buildArchiveManifest({
      chains: [
        {
          entries: [
            {
              authorName: "Ari",
              skipped: true,
              text: "Drawing skipped by host",
              turn: 1,
              type: "drawing",
            },
          ],
          order: 0,
          ownerName: "Ari",
        },
      ],
      generatedAt: Date.UTC(2026, 4, 16, 20, 0, 0),
      players: [{ displayName: "Ari", isHost: true, order: 0 }],
      room: {
        code: "ROOM",
        settings: {
          drawingSeconds: 0,
          guessingSeconds: 0,
          promptMode: "safe-pack",
          promptPackLabel: "Food",
        },
      },
    });

    expect(manifest.summaryLines).toContain("Prompts: App prompt pack - Food");
    expect(manifest.summaryLines).toContain("Timers: Off");
    expect(manifest.chains[0]?.entries[0]).toMatchObject({
      body: "Drawing skipped by host",
      isSkipped: true,
      label: "Turn 1 · Drawing",
    });
  });
});
