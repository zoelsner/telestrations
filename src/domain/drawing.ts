export const CANVAS_SIZE = {
  width: 960,
  height: 720,
} as const;

export const DRAWING_COLORS = [
  "#111827",
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#2563eb",
  "#7c3aed",
] as const;

export const BRUSH_SIZES = [4, 8, 14] as const;

export const DEFAULT_DRAWING_COLOR = DRAWING_COLORS[0];
export const DEFAULT_BRUSH_SIZE = BRUSH_SIZES[1];
export const DRAWING_BACKGROUND_COLOR = "#fffdf7";

export type DrawingColor = (typeof DRAWING_COLORS)[number];
export type BrushSize = (typeof BRUSH_SIZES)[number];

export type DrawingPoint = {
  x: number;
  y: number;
  pressure?: number;
  t?: number;
};

export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: DrawingPoint[];
  startedAt?: number;
  endedAt?: number;
};

export type DrawingHistory = {
  strokes: DrawingStroke[];
  undoStack: DrawingStroke[][];
  redoStack: DrawingStroke[][];
  canUndo: boolean;
  canRedo: boolean;
};

export function createDrawingHistory(): DrawingHistory {
  return withHistoryFlags({
    redoStack: [],
    strokes: [],
    undoStack: [],
  });
}

export function createStroke({
  color,
  id,
  point,
  startedAt,
  width,
}: {
  color: string;
  id: string;
  point: DrawingPoint;
  startedAt?: number;
  width: number;
}): DrawingStroke {
  return {
    color,
    id,
    points: [point],
    ...(startedAt === undefined ? {} : { startedAt }),
    width,
  };
}

export function appendPointToStroke(stroke: DrawingStroke, point: DrawingPoint): DrawingStroke {
  return {
    ...stroke,
    points: [...stroke.points, point],
  };
}

export function finishStroke(stroke: DrawingStroke, endedAt: number): DrawingStroke {
  return {
    ...stroke,
    endedAt,
  };
}

export function commitStroke(history: DrawingHistory, stroke: DrawingStroke): DrawingHistory {
  return commitSnapshot(history, [...history.strokes, cloneStroke(stroke)]);
}

export function clearDrawing(history: DrawingHistory): DrawingHistory {
  if (history.strokes.length === 0) {
    return history;
  }

  return commitSnapshot(history, []);
}

export function undoDrawingChange(history: DrawingHistory): DrawingHistory {
  const previousStrokes = history.undoStack.at(-1);

  if (!previousStrokes) {
    return history;
  }

  return withHistoryFlags({
    redoStack: [cloneStrokes(history.strokes), ...history.redoStack],
    strokes: cloneStrokes(previousStrokes),
    undoStack: history.undoStack.slice(0, -1).map(cloneStrokes),
  });
}

export function redoDrawingChange(history: DrawingHistory): DrawingHistory {
  const [nextStrokes, ...remainingRedoStack] = history.redoStack;

  if (!nextStrokes) {
    return history;
  }

  return withHistoryFlags({
    redoStack: remainingRedoStack.map(cloneStrokes),
    strokes: cloneStrokes(nextStrokes),
    undoStack: [...history.undoStack.map(cloneStrokes), cloneStrokes(history.strokes)],
  });
}

function commitSnapshot(history: DrawingHistory, nextStrokes: DrawingStroke[]): DrawingHistory {
  return withHistoryFlags({
    redoStack: [],
    strokes: cloneStrokes(nextStrokes),
    undoStack: [...history.undoStack.map(cloneStrokes), cloneStrokes(history.strokes)],
  });
}

function withHistoryFlags({
  redoStack,
  strokes,
  undoStack,
}: {
  redoStack: DrawingStroke[][];
  strokes: DrawingStroke[];
  undoStack: DrawingStroke[][];
}): DrawingHistory {
  return {
    canRedo: redoStack.length > 0,
    canUndo: undoStack.length > 0,
    redoStack,
    strokes,
    undoStack,
  };
}

function cloneStrokes(strokes: DrawingStroke[]): DrawingStroke[] {
  return strokes.map(cloneStroke);
}

function cloneStroke(stroke: DrawingStroke): DrawingStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  };
}
