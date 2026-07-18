"use client";

import { Brush, Eraser, Redo2, Undo2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { IconButton } from "@/components/ui";
import {
  appendPointToStroke,
  BRUSH_SIZES,
  CANVAS_SIZE,
  clearDrawing,
  commitStroke,
  createDrawingHistory,
  createStroke,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_DRAWING_COLOR,
  DRAWING_BACKGROUND_COLOR,
  DRAWING_COLORS,
  finishStroke,
  redoDrawingChange,
  type BrushSize,
  type DrawingColor,
  type DrawingPoint,
  type DrawingStroke,
  undoDrawingChange,
} from "@/domain/drawing";

const colorLabels: Record<DrawingColor, string> = {
  "#111827": "black",
  "#6b7280": "gray",
  "#ef4444": "red",
  "#f97316": "orange",
  "#eab308": "yellow",
  "#22c55e": "green",
  "#2563eb": "blue",
  "#7c3aed": "purple",
};

export type DrawingBoardExportStatus =
  | {
      kind: "empty";
    }
  | {
      byteSize: number;
      dataUrl: string;
      height: number;
      kind: "ready";
      mimeType: "image/png";
      width: number;
    };

export type DrawingBoardValue = {
  exportStatus: DrawingBoardExportStatus;
  strokes: DrawingStroke[];
};

let fallbackStrokeId = 0;

export function DrawingBoard({
  disabled = false,
  onChange,
}: {
  disabled?: boolean;
  onChange?: (value: DrawingBoardValue) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null);
  const [brushSize, setBrushSize] = useState<BrushSize>(DEFAULT_BRUSH_SIZE);
  const [color, setColor] = useState<DrawingColor>(DEFAULT_DRAWING_COLOR);
  const [history, setHistory] = useState(createDrawingHistory);

  const visibleStrokes = useMemo(
    () => (activeStroke ? [...history.strokes, activeStroke] : history.strokes),
    [activeStroke, history.strokes],
  );

  const exportStatus = useMemo<DrawingBoardExportStatus>(() => {
    if (history.strokes.length === 0 || typeof document === "undefined") {
      return { kind: "empty" };
    }

    return createPngExport(history.strokes);
  }, [history.strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    renderDrawing(canvas, visibleStrokes);
  }, [visibleStrokes]);

  useEffect(() => {
    onChange?.({
      exportStatus,
      strokes: history.strokes,
    });
  }, [exportStatus, history.strokes, onChange]);

  const endActiveStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;

    if (!stroke) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const endedAt = Date.now();
    activeStrokeRef.current = null;
    setActiveStroke(null);
    setHistory((currentHistory) => commitStroke(currentHistory, finishStroke(stroke, endedAt)));
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startedAt = Date.now();
    const stroke = createStroke({
      color,
      id: createStrokeId(),
      point: pointFromEvent(event, startedAt),
      startedAt,
      width: brushSize,
    });

    activeStrokeRef.current = stroke;
    setActiveStroke(stroke);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) {
      return;
    }

    const stroke = activeStrokeRef.current;

    if (!stroke) {
      return;
    }

    event.preventDefault();

    const nextStroke = appendPointToStroke(stroke, pointFromEvent(event, Date.now()));
    activeStrokeRef.current = nextStroke;
    setActiveStroke(nextStroke);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activeStrokeRef.current = null;
    setActiveStroke(null);
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div
        className="flex min-w-0 flex-col gap-3 rounded-xl border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] p-2 sm:flex-row sm:items-center sm:justify-between"
        data-testid="drawing-toolbar"
      >
        <div className="flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
          <IconButton
            aria-pressed="true"
            className="border-transparent bg-[var(--app-ink)] text-[var(--app-cream)] hover:bg-[var(--app-ink-hover)] hover:text-[var(--app-cream)]"
            disabled={disabled}
            label="Brush tool"
          >
            <Brush size={17} />
          </IconButton>
          <IconButton
            disabled={disabled || !history.canUndo}
            label="Undo stroke"
            onClick={() => setHistory(undoDrawingChange)}
          >
            <Undo2 size={17} />
          </IconButton>
          <IconButton
            disabled={disabled || !history.canRedo}
            label="Redo stroke"
            onClick={() => setHistory(redoDrawingChange)}
          >
            <Redo2 size={17} />
          </IconButton>
          <IconButton
            disabled={disabled || history.strokes.length === 0}
            label="Clear drawing"
            onClick={() => setHistory(clearDrawing)}
          >
            <Eraser size={17} />
          </IconButton>
        </div>

        <div className="flex min-w-0 touch-pan-x items-end gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
          {DRAWING_COLORS.map((swatch) => (
            <button
              aria-label={`Use ${colorLabels[swatch]}`}
              aria-pressed={color === swatch}
              className="h-6 w-11 shrink-0 self-end rounded-t-full transition focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] sm:h-[15px] sm:w-[30px]"
              disabled={disabled}
              key={swatch}
              onClick={() => setColor(swatch)}
              style={{
                backgroundColor: swatch,
                boxShadow: color === swatch ? "0 2px 0 0 var(--app-accent)" : undefined,
                transform: color === swatch ? "translateY(-2px)" : undefined,
              }}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
          {BRUSH_SIZES.map((size) => (
            <button
              aria-label={`${size}px brush`}
              aria-pressed={brushSize === size}
              className={`h-9 shrink-0 rounded-lg border-[1.5px] px-3 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)] ${
                brushSize === size
                  ? "border-transparent bg-[var(--app-ink)] text-[var(--app-cream)]"
                  : "border-[var(--app-border)] bg-white text-[var(--app-muted)] hover:bg-[var(--app-soft)]"
              }`}
              disabled={disabled}
              key={size}
              onClick={() => setBrushSize(size)}
              type="button"
            >
              {size}px
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
          <output data-testid="drawing-status" id="drawing-canvas-status">
            {history.strokes.length} {history.strokes.length === 1 ? "stroke" : "strokes"}
          </output>
          <output
            data-byte-size={exportStatus.kind === "ready" ? exportStatus.byteSize : undefined}
            data-mime-type={exportStatus.kind === "ready" ? exportStatus.mimeType : undefined}
            data-testid="drawing-export-status"
          >
            {exportStatus.kind === "ready"
              ? `PNG ready - ${exportStatus.width}x${exportStatus.height}`
              : "PNG waiting"}
          </output>
        </div>
      </div>

      <div
        aria-label="Drawing canvas"
        className="aspect-[4/3] w-full min-w-0 touch-none select-none overscroll-contain rounded-[14px] border-[1.5px] border-[var(--app-border)] bg-[var(--paper)] p-2 shadow-inner sm:p-4"
        data-testid="drawing-canvas"
        role="img"
      >
        <canvas
          aria-describedby="drawing-canvas-status"
          aria-label="Drawing surface"
          className="h-full w-full touch-none rounded-md bg-[var(--paper)]"
          data-testid="drawing-canvas-element"
          height={CANVAS_SIZE.height}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endActiveStroke}
          ref={canvasRef}
          width={CANVAS_SIZE.width}
        />
      </div>
    </div>
  );
}

function pointFromEvent(
  event: ReactPointerEvent<HTMLCanvasElement>,
  timestamp: number,
): DrawingPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const pressure = event.pressure > 0 && event.pressure < 1 ? event.pressure : undefined;

  return {
    ...(pressure === undefined ? {} : { pressure }),
    t: timestamp,
    x: clamp(((event.clientX - rect.left) / rect.width) * CANVAS_SIZE.width, 0, CANVAS_SIZE.width),
    y: clamp(
      ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE.height,
      0,
      CANVAS_SIZE.height,
    ),
  };
}

function renderDrawing(canvas: HTMLCanvasElement, strokes: DrawingStroke[]) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
  context.fillStyle = DRAWING_BACKGROUND_COLOR;
  context.fillRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);

  for (const stroke of strokes) {
    renderStroke(context, stroke);
  }
}

function renderStroke(context: CanvasRenderingContext2D, stroke: DrawingStroke) {
  const firstPoint = stroke.points[0];

  if (!firstPoint) {
    return;
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.width;

  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(firstPoint.x, firstPoint.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function createPngExport(strokes: DrawingStroke[]): DrawingBoardExportStatus {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE.width;
  canvas.height = CANVAS_SIZE.height;
  renderDrawing(canvas, strokes);

  const dataUrl = canvas.toDataURL("image/png");

  return {
    byteSize: estimateBase64ByteSize(dataUrl),
    dataUrl,
    height: CANVAS_SIZE.height,
    kind: "ready",
    mimeType: "image/png",
    width: CANVAS_SIZE.width,
  };
}

function estimateBase64ByteSize(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function createStrokeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  fallbackStrokeId += 1;
  return `stroke-${Date.now()}-${fallbackStrokeId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
