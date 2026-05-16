import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import {
  buildArchiveManifest,
  type ArchiveChainInput,
  type ArchiveEntry,
  type ArchiveEntryInput,
  type ArchiveManifest,
} from "@/domain/archive-export";

export type RevealPdfEntry =
  | {
      authorName: string;
      id: string;
      text: string;
      turn: number;
      type: "prompt";
    }
  | {
      authorName: string;
      id: string;
      imageUrl?: string;
      skipped?: true;
      text?: string;
      turn: number;
      type: "drawing";
    }
  | {
      authorName: string;
      id: string;
      text: string;
      turn: number;
      type: "guess";
    };

export type RevealPdfData = {
  chains: Array<{
    entries: RevealPdfEntry[];
    order: number;
    ownerName: string;
  }>;
  players: Array<{
    displayName: string;
    isHost: boolean;
    order: number;
  }>;
  room: {
    code: string;
    revealedAt?: number;
    settings: {
      drawingSeconds: number;
      guessingSeconds: number;
      promptMode: "player-written" | "safe-pack" | "mixed";
      promptPackLabel?: string;
    };
  };
};

type PdfFonts = {
  bold: PDFFont;
  regular: PDFFont;
};

type PdfState = {
  fonts: PdfFonts;
  page: PDFPage;
  pdfDoc: PDFDocument;
  y: number;
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 48;
const contentWidth = pageWidth - margin * 2;

export async function downloadRevealPdf(reveal: RevealPdfData) {
  const { bytes, fileName } = await createRevealPdf(reveal);
  const blob = new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toArrayBuffer(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(arrayBuffer).set(bytes);

  return arrayBuffer;
}

export async function createRevealPdf(reveal: RevealPdfData, generatedAt = Date.now()) {
  const manifest = buildArchiveManifest({
    chains: reveal.chains.map(toArchiveChain),
    generatedAt: reveal.room.revealedAt ?? generatedAt,
    players: reveal.players,
    room: reveal.room,
  });
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
  };
  const state: PdfState = {
    fonts,
    page: pdfDoc.addPage([pageWidth, pageHeight]),
    pdfDoc,
    y: pageHeight - margin,
  };

  drawHeader(state, manifest);

  for (const chain of manifest.chains) {
    ensureSpace(state, 92);
    drawText(state, `${chain.label}: ${chain.ownerName}`, {
      font: fonts.bold,
      size: 15,
    });
    state.y -= 8;

    for (const entry of chain.entries) {
      await drawEntry(state, entry);
    }

    state.y -= 8;
  }

  return {
    bytes: await pdfDoc.save(),
    fileName: manifest.fileName,
  };
}

function toArchiveChain(chain: RevealPdfData["chains"][number]): ArchiveChainInput {
  return {
    entries: chain.entries.map(toArchiveEntry),
    order: chain.order,
    ownerName: chain.ownerName,
  };
}

function toArchiveEntry(entry: RevealPdfEntry): ArchiveEntryInput {
  if (entry.type === "drawing") {
    return {
      authorName: entry.authorName,
      ...(entry.imageUrl === undefined ? {} : { imageUrl: entry.imageUrl }),
      ...(entry.skipped === true ? { skipped: true, text: entry.text } : {}),
      turn: entry.turn,
      type: "drawing",
    };
  }

  return {
    authorName: entry.authorName,
    text: entry.text,
    turn: entry.turn,
    type: entry.type,
  };
}

function drawHeader(state: PdfState, manifest: ArchiveManifest) {
  drawText(state, manifest.title, {
    font: state.fonts.bold,
    size: 24,
  });
  state.y -= 6;

  for (const line of manifest.summaryLines) {
    drawWrappedText(state, line, {
      color: rgb(0.32, 0.32, 0.32),
      font: state.fonts.regular,
      size: 10,
    });
  }

  state.y -= 18;
}

async function drawEntry(state: PdfState, entry: ArchiveEntry) {
  ensureSpace(state, 56);
  drawText(state, entry.label, {
    font: state.fonts.bold,
    indent: 12,
    size: 11,
  });
  drawText(state, entry.authorName, {
    color: rgb(0.42, 0.42, 0.42),
    indent: 12,
    size: 9,
  });

  if (entry.type === "drawing" && !entry.isSkipped && entry.imageUrl) {
    await drawDrawingImage(state, entry.imageUrl);
    return;
  }

  drawWrappedText(state, entry.body ?? "Drawing image unavailable.", {
    indent: 12,
    size: 12,
  });
  state.y -= 10;
}

async function drawDrawingImage(state: PdfState, imageUrl: string) {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Drawing image fetch failed.");
    }

    const imageBytes = await response.arrayBuffer();
    const image = await state.pdfDoc.embedPng(imageBytes);
    const maxImageWidth = contentWidth - 24;
    const maxImageHeight = 280;
    const scale = Math.min(maxImageWidth / image.width, maxImageHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;

    ensureSpace(state, height + 18);
    state.page.drawImage(image, {
      height,
      width,
      x: margin + 12,
      y: state.y - height,
    });
    state.y -= height + 16;
  } catch {
    drawWrappedText(state, "Drawing image unavailable.", {
      color: rgb(0.5, 0.16, 0.16),
      indent: 12,
      size: 12,
    });
    state.y -= 10;
  }
}

function drawText(
  state: PdfState,
  text: string,
  {
    color = rgb(0.07, 0.07, 0.07),
    font = state.fonts.regular,
    indent = 0,
    size,
  }: {
    color?: ReturnType<typeof rgb>;
    font?: PDFFont;
    indent?: number;
    size: number;
  },
) {
  ensureSpace(state, size + 8);
  state.page.drawText(text, {
    color,
    font,
    size,
    x: margin + indent,
    y: state.y,
  });
  state.y -= size + 5;
}

function drawWrappedText(
  state: PdfState,
  text: string,
  {
    color = rgb(0.07, 0.07, 0.07),
    font = state.fonts.regular,
    indent = 0,
    size,
  }: {
    color?: ReturnType<typeof rgb>;
    font?: PDFFont;
    indent?: number;
    size: number;
  },
) {
  const lineHeight = size + 5;
  const lines = wrapText(text, font, size, contentWidth - indent);

  for (const line of lines) {
    ensureSpace(state, lineHeight);
    state.page.drawText(line, {
      color,
      font,
      size,
      x: margin + indent,
      y: state.y,
    });
    state.y -= lineHeight;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

function ensureSpace(state: PdfState, requiredHeight: number) {
  if (state.y - requiredHeight >= margin) {
    return;
  }

  state.page = state.pdfDoc.addPage([pageWidth, pageHeight]);
  state.y = pageHeight - margin;
}
