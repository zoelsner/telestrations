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
      "A sleepy laptop",
      "A coffee mug volcano",
      "A spinning desk chair",
      "A messy whiteboard",
      "A calendar with teeth",
      "A giant sticky note",
      "A printer paper mountain",
      "A backpack with wings",
    ],
    version: 1,
  },
  {
    id: "product-tech",
    label: "Product and Tech",
    prompts: [
      "A tiny robot chef",
      "A rocket button",
      "A lock with sunglasses",
      "A phone app maze",
      "A wiggly bar chart",
      "A computer bug sticker",
      "A cloud wearing headphones",
      "A green check trophy",
    ],
    version: 1,
  },
  {
    id: "food",
    label: "Food",
    prompts: [
      "A pizza slice crown",
      "A taco umbrella",
      "A sandwich tower",
      "A donut spaceship",
      "A cupcake rocket",
      "A banana phone",
      "A coffee cup castle",
      "An ice cream mountain",
    ],
    version: 1,
  },
  {
    id: "travel",
    label: "Travel",
    prompts: [
      "A suitcase with wheels",
      "A passport stamp sun",
      "A train on clouds",
      "An airplane sandwich",
      "A treasure map",
      "A hotel key crown",
      "A bicycle rocket",
      "A camera with legs",
    ],
    version: 1,
  },
  {
    id: "animals",
    label: "Animals",
    prompts: [
      "A cat astronaut",
      "A dog detective",
      "A penguin chef",
      "A turtle racecar",
      "A giraffe scarf",
      "A whale balloon",
      "A rabbit magician",
      "A bear backpack",
    ],
    version: 1,
  },
  {
    id: "abstract-weird",
    label: "Simple and Weird",
    prompts: [
      "A happy cloud",
      "A rainbow ladder",
      "A tiny planet hat",
      "A question mark umbrella",
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
