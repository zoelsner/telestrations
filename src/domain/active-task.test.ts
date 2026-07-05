import { describe, expect, it } from "vitest";

import { buildActiveTaskView } from "./active-task";

describe("buildActiveTaskView", () => {
  it("builds a first-turn prompt task without exposing chain history", () => {
    expect(
      buildActiveTaskView({
        assignment: {
          entryType: "prompt",
          status: "pending",
          turn: 0,
        },
        currentTurn: 0,
        roomStatus: "active",
      }),
    ).toEqual({
      currentTurn: 0,
      entryType: "prompt",
      inputLabel: "Your prompt",
      maxLength: 160,
      state: "compose",
      submitLabel: "Send it down the line",
      title: "Write a prompt",
    });
  });

  it("shows only the immediately previous text entry for drawing tasks", () => {
    expect(
      buildActiveTaskView({
        assignment: {
          entryType: "drawing",
          previousEntry: {
            kind: "text",
            label: "Previous prompt",
            turn: 0,
            value: "A sales forecast catching fire",
          },
          status: "pending",
          turn: 1,
        },
        currentTurn: 1,
        roomStatus: "active",
      }),
    ).toEqual({
      currentTurn: 1,
      entryType: "drawing",
      previousEntry: {
        kind: "text",
        label: "Previous prompt",
        turn: 0,
        value: "A sales forecast catching fire",
      },
      state: "compose",
      submitLabel: "Pass it on",
      title: "Draw this",
    });
  });

  it("shows only the immediately previous drawing for guess tasks", () => {
    expect(
      buildActiveTaskView({
        assignment: {
          entryType: "guess",
          previousEntry: {
            imageUrl: "https://example.com/drawing.png",
            kind: "drawing",
            label: "Previous drawing",
            turn: 1,
          },
          status: "pending",
          turn: 2,
        },
        currentTurn: 2,
        roomStatus: "active",
      }),
    ).toEqual({
      currentTurn: 2,
      entryType: "guess",
      inputLabel: "Your guess",
      maxLength: 120,
      previousEntry: {
        imageUrl: "https://example.com/drawing.png",
        kind: "drawing",
        label: "Previous drawing",
        turn: 1,
      },
      state: "compose",
      submitLabel: "Lock in guess",
      title: "What is this?",
    });
  });

  it("routes submitted assignments to a waiting state", () => {
    expect(
      buildActiveTaskView({
        assignment: {
          entryType: "prompt",
          status: "submitted",
          submittedEntryId: "entry-1",
          turn: 0,
        },
        currentTurn: 0,
        roomStatus: "active",
      }),
    ).toEqual({
      currentTurn: 0,
      entryType: "prompt",
      state: "waiting",
      title: "Waiting for the next turn",
    });
  });
});
