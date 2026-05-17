import { describe, expect, it } from "vitest";

import {
  PROMPT_PACK_IDS,
  getPromptPack,
  getPromptPackOptions,
  selectPackPrompt,
  validatePromptPackId,
} from "./prompt-packs";

describe("prompt packs", () => {
  it("defines the MVP work-safe prompt packs", () => {
    expect(PROMPT_PACK_IDS).toEqual([
      "office-objects",
      "product-tech",
      "food",
      "travel",
      "animals",
      "abstract-weird",
      "mixed",
    ]);
    expect(getPromptPackOptions()).toEqual(
      expect.arrayContaining([
        { id: "office-objects", label: "Things" },
        { id: "product-tech", label: "Actions" },
        { id: "travel", label: "Places" },
        { id: "abstract-weird", label: "People and Characters" },
        { id: "mixed", label: "Mixed" },
      ]),
    );
  });

  it("validates selected prompt pack ids", () => {
    expect(validatePromptPackId("food")).toEqual({ ok: true, value: "food" });
    expect(validatePromptPackId("adult")).toMatchObject({
      ok: false,
      reason: "Prompt pack is not available.",
    });
  });

  it("keeps app prompt pack items card-like and quick to draw", () => {
    for (const packId of PROMPT_PACK_IDS) {
      for (const prompt of getPromptPack(packId).prompts) {
        expect(prompt.split(/\s+/).length, prompt).toBeLessThanOrEqual(3);
        expect(prompt, prompt).not.toMatch(/^(A|An|The)\s/);
      }
    }
  });

  it("selects deterministic, distributed prompts by room seed and player order", () => {
    const first = selectPackPrompt({
      packId: "product-tech",
      playerOrder: 0,
      roomSeed: "ROOM-A",
      usedPrompts: [],
    });
    const second = selectPackPrompt({
      packId: "product-tech",
      playerOrder: 1,
      roomSeed: "ROOM-A",
      usedPrompts: [first],
    });

    expect(getPromptPack("product-tech").prompts).toContain(first);
    expect(getPromptPack("product-tech").prompts).toContain(second);
    expect(second).not.toBe(first);
    expect(
      selectPackPrompt({
        packId: "product-tech",
        playerOrder: 0,
        roomSeed: "ROOM-A",
        usedPrompts: [],
      }),
    ).toBe(first);
  });
});
