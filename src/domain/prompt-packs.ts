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
    label: "Things",
    prompts: [
      "Umbrella",
      "Toothbrush",
      "Sunglasses",
      "Kite",
      "Flashlight",
      "Mailbox",
      "Ladder",
      "Key",
    ],
    version: 1,
  },
  {
    id: "product-tech",
    label: "Actions",
    prompts: [
      "Brushing teeth",
      "Flying kite",
      "Jumping rope",
      "Riding bike",
      "Washing dishes",
      "Playing guitar",
      "Taking photo",
      "Building sandcastle",
    ],
    version: 1,
  },
  {
    id: "food",
    label: "Food",
    prompts: [
      "Hot dog",
      "Pancake",
      "Popcorn",
      "Apple pie",
      "Birthday cake",
      "Spaghetti",
      "Hamburger",
      "Ice cream",
    ],
    version: 1,
  },
  {
    id: "travel",
    label: "Places",
    prompts: [
      "Beach",
      "Castle",
      "Playground",
      "Grocery store",
      "Classroom",
      "Library",
      "Airport",
      "Campsite",
    ],
    version: 1,
  },
  {
    id: "animals",
    label: "Animals",
    prompts: ["Elephant", "Shark", "Monkey", "Owl", "Snake", "Horse", "Fish", "Spider"],
    version: 1,
  },
  {
    id: "abstract-weird",
    label: "People and Characters",
    prompts: [
      "Doctor",
      "Teacher",
      "Chef",
      "Firefighter",
      "Astronaut",
      "Pirate",
      "Superhero",
      "Magician",
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
