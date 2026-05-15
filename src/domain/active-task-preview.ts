export type VisibleEntry =
  | {
      kind: "text";
      label: "Previous prompt" | "Previous guess";
      turn: number;
      value: string;
    }
  | {
      kind: "drawing";
      label: "Previous drawing";
      turn: number;
      alt: string;
    };

export type ActiveTaskPreview = {
  kind: "draw" | "guess";
  title: string;
  currentTurn: number;
  timer: string;
  visibleEntry: VisibleEntry;
};

export const activeTaskPreview = {
  drawTask: {
    kind: "draw",
    title: "Draw this",
    currentTurn: 2,
    timer: "01:12",
    visibleEntry: {
      kind: "text",
      label: "Previous guess",
      turn: 1,
      value: "A calendar invite that got way too serious",
    },
  },
  guessTask: {
    kind: "guess",
    title: "Guess this",
    currentTurn: 3,
    timer: "00:48",
    visibleEntry: {
      kind: "drawing",
      label: "Previous drawing",
      turn: 2,
      alt: "A simple line drawing with a calendar, alert marker, and dramatic motion lines.",
    },
  },
} as const satisfies {
  drawTask: ActiveTaskPreview;
  guessTask: ActiveTaskPreview;
};
