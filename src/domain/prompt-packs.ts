export const PROMPT_PACK_IDS = [
  "office-objects",
  "product-tech",
  "food",
  "travel",
  "animals",
  "abstract-weird",
  "mixed",
] as const;

export type PromptPackId = (typeof PROMPT_PACK_IDS)[number];

export type PromptPack = {
  id: PromptPackId;
  label: string;
  prompts: readonly string[];
  version: 1;
};

const promptPacks = [
  {
    id: "office-objects",
    label: "Office Objects",
    prompts: [
      "A laptop",
      "A coffee mug",
      "A desk chair",
      "A whiteboard",
      "A calendar page",
      "A sticky note",
      "A printer",
      "A backpack",
    ],
    version: 1,
  },
  {
    id: "product-tech",
    label: "Product and Tech",
    prompts: [
      "A robot",
      "A rocket",
      "A lock icon",
      "A phone app",
      "A bar chart",
      "A computer bug",
      "A cloud icon",
      "A green checkmark",
    ],
    version: 1,
  },
  {
    id: "food",
    label: "Food",
    prompts: [
      "A pizza slice",
      "A taco",
      "A sandwich",
      "A donut",
      "A cupcake",
      "A banana",
      "A coffee cup",
      "An ice cream cone",
    ],
    version: 1,
  },
  {
    id: "travel",
    label: "Travel",
    prompts: [
      "A suitcase",
      "A passport",
      "A train",
      "An airplane",
      "A map",
      "A hotel key",
      "A bicycle",
      "A camera",
    ],
    version: 1,
  },
  {
    id: "animals",
    label: "Animals",
    prompts: [
      "A cat",
      "A dog",
      "A penguin",
      "A turtle",
      "A giraffe",
      "A whale",
      "A rabbit",
      "A bear",
    ],
    version: 1,
  },
  {
    id: "abstract-weird",
    label: "Simple and Weird",
    prompts: [
      "A happy cloud",
      "A rainbow",
      "A tiny planet",
      "A question mark",
      "A clock with legs",
      "A magic door",
      "A star with glasses",
      "A sleepy moon",
    ],
    version: 1,
  },
] as const satisfies readonly PromptPack[];

const mixedPromptPack = {
  id: "mixed",
  label: "Mixed",
  prompts: promptPacks.flatMap((pack) => pack.prompts),
  version: 1,
} as const satisfies PromptPack;

export function getPromptPackOptions() {
  return [...promptPacks, mixedPromptPack].map((pack) => ({
    id: pack.id,
    label: pack.label,
  }));
}

export function getPromptPack(id: PromptPackId): PromptPack {
  return [...promptPacks, mixedPromptPack].find((pack) => pack.id === id) ?? mixedPromptPack;
}

export function validatePromptPackId(
  value: string | undefined,
): { ok: true; value: PromptPackId } | { ok: false; reason: string } {
  if (value && PROMPT_PACK_IDS.includes(value as PromptPackId)) {
    return { ok: true, value: value as PromptPackId };
  }

  return { ok: false, reason: "Prompt pack is not available." };
}

export function selectPackPrompt({
  packId,
  playerOrder,
  roomSeed,
  usedPrompts,
}: {
  packId: PromptPackId;
  playerOrder: number;
  roomSeed: string;
  usedPrompts: readonly string[];
}) {
  const prompts = getPromptPack(packId).prompts;
  const startIndex = Math.abs(hashString(`${roomSeed}:${playerOrder}`)) % prompts.length;

  for (let offset = 0; offset < prompts.length; offset += 1) {
    const prompt = prompts[(startIndex + offset) % prompts.length];

    if (prompt && !usedPrompts.includes(prompt)) {
      return prompt;
    }
  }

  return prompts[startIndex] ?? prompts[0] ?? "A friendly office mystery";
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return hash;
}
