import { describe, expect, it } from "vitest";

import { buildRevealView } from "./reveal";

describe("buildRevealView", () => {
  it("orders chains and entries for one-at-a-time reveal navigation", () => {
    expect(
      buildRevealView({
        chains: [
          {
            entries: [
              { authorName: "Nina", id: "entry-3", turn: 2, type: "guess" },
              { authorName: "Maya", id: "entry-1", turn: 0, type: "prompt" },
              { authorName: "Drew", id: "entry-2", turn: 1, type: "drawing" },
            ],
            id: "chain-2",
            order: 1,
            ownerName: "Maya",
          },
          {
            entries: [{ authorName: "Drew", id: "entry-4", turn: 0, type: "prompt" }],
            id: "chain-1",
            order: 0,
            ownerName: "Drew",
          },
        ],
        selectedChainId: "chain-2",
      }),
    ).toEqual({
      canGoNext: false,
      canGoPrevious: true,
      chainCount: 2,
      currentIndex: 1,
      overview: [
        { id: "chain-1", isSelected: false, label: "Chain 1", ownerName: "Drew" },
        { id: "chain-2", isSelected: true, label: "Chain 2", ownerName: "Maya" },
      ],
      selectedChain: {
        entries: [
          { authorName: "Maya", id: "entry-1", turn: 0, type: "prompt" },
          { authorName: "Drew", id: "entry-2", turn: 1, type: "drawing" },
          { authorName: "Nina", id: "entry-3", turn: 2, type: "guess" },
        ],
        id: "chain-2",
        label: "Chain 2",
        order: 1,
        ownerName: "Maya",
      },
    });
  });

  it("selects the first chain when the requested chain is missing", () => {
    expect(
      buildRevealView({
        chains: [
          {
            entries: [],
            id: "chain-1",
            order: 0,
            ownerName: "Drew",
          },
        ],
        selectedChainId: "missing",
      }).selectedChain?.id,
    ).toBe("chain-1");
  });
});
