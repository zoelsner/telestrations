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
      "A keyboard hosting a team meeting",
      "A desk chair racing down the hallway",
      "A printer wearing a tiny crown",
      "A spreadsheet escaping from a laptop",
      "A calendar invite with too many alarms",
      "A coffee mug guarding the whiteboard",
      "A sticky note trying to organize a roadmap",
      "A conference badge on vacation",
    ],
    version: 1,
  },
  {
    id: "product-tech",
    label: "Product and Tech",
    prompts: [
      "A bug report with a victory parade",
      "A launch button under a glass cover",
      "A dashboard celebrating a green check",
      "A robot presenting a quarterly roadmap",
      "A feature flag floating above a city",
      "A server rack doing a standup update",
      "A prototype made from sticky notes",
      "A release train arriving early",
    ],
    version: 1,
  },
  {
    id: "food",
    label: "Food",
    prompts: [
      "A sandwich giving a project update",
      "A pizza slice with a color-coded roadmap",
      "A taco carrying a laptop bag",
      "A donut guarding the office kitchen",
      "A bowl of noodles in a brainstorming session",
      "A cupcake with a tiny checklist",
      "A burrito riding an elevator",
      "A smoothie wearing headphones",
    ],
    version: 1,
  },
  {
    id: "travel",
    label: "Travel",
    prompts: [
      "A suitcase waiting for a video call",
      "A passport covered in sticky notes",
      "A train full of tiny whiteboards",
      "A map pointing to the break room",
      "A boarding pass with a launch checklist",
      "A hotel key joining a standup",
      "A bicycle delivering a roadmap",
      "A landmark holding a coffee mug",
    ],
    version: 1,
  },
  {
    id: "animals",
    label: "Animals",
    prompts: [
      "A penguin managing a sprint board",
      "A llama wearing a visitor badge",
      "A fox presenting a slide deck",
      "A whale carrying a tiny laptop",
      "A turtle leading a calm meeting",
      "A giraffe reading a long dashboard",
      "A bear choosing a paint color",
      "A rabbit delivering office mail",
    ],
    version: 1,
  },
  {
    id: "abstract-weird",
    label: "Abstract and Weird",
    prompts: [
      "A cloud made of checkboxes",
      "A deadline wearing roller skates",
      "A question mark with a backpack",
      "A rainbow coming out of a spreadsheet",
      "A tiny elevator for big ideas",
      "A meeting note turning into confetti",
      "A roadmap wrapped around the moon",
      "A clock trying to take a coffee break",
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
