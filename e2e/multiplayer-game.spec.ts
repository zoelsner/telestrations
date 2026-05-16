import { expect, type Page, test } from "@playwright/test";

test.describe("multiplayer game loop", () => {
  test("lets the host skip a stuck prompt from the waiting screen", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run recovery path once");

    const hostContext = await browser.newContext();
    const guestOneContext = await browser.newContext();
    const guestTwoContext = await browser.newContext();

    try {
      const host = await hostContext.newPage();
      const guestOne = await guestOneContext.newPage();
      const guestTwo = await guestTwoContext.newPage();

      await host.goto("/");
      await host.getByPlaceholder("Maya").fill("Recovery Host");
      await host.getByRole("button", { name: "Create room" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z2-9]{4}$/);

      const roomUrl = host.url();

      await joinRoom(guestOne, roomUrl, "Stuck Teammate");
      await joinRoom(guestTwo, roomUrl, "Ready Teammate");

      await host.getByRole("button", { name: "Start game" }).click();

      await submitPrompt(host, "A sprint review with confetti");

      await expect(
        host.getByRole("heading", { name: "Waiting for the next turn" }).first(),
      ).toBeVisible();
      await expect(host.getByLabel("Turn status").getByText("Stuck Teammate")).toBeVisible();

      await host.getByRole("button", { name: "Skip Stuck Teammate" }).click();

      await expect(host.getByText("1 assignment was skipped by the host this turn")).toBeVisible();
      await expect(
        guestOne.getByRole("heading", { name: "Waiting for the next turn" }).first(),
      ).toBeVisible();

      await submitPrompt(guestTwo, "A roadmap drawn on a napkin");

      await expect(host.getByRole("heading", { name: "Draw this" })).toBeVisible();
    } finally {
      await hostContext.close();
      await guestOneContext.close();
      await guestTwoContext.close();
    }
  });

  test("starts directly on drawing when the host selects an app prompt pack", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run prompt pack path once");

    const hostContext = await browser.newContext();
    const guestOneContext = await browser.newContext();
    const guestTwoContext = await browser.newContext();

    try {
      const host = await hostContext.newPage();
      const guestOne = await guestOneContext.newPage();
      const guestTwo = await guestTwoContext.newPage();

      await host.goto("/");
      await host.getByPlaceholder("Maya").fill("Prompt Host");
      await host.getByRole("button", { name: "Create room" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z2-9]{4}$/);

      const roomUrl = host.url();

      await joinRoom(guestOne, roomUrl, "Prompt Two");
      await joinRoom(guestTwo, roomUrl, "Prompt Three");

      await host.getByLabel("Prompt source").selectOption({ label: "App prompt pack" });
      await expect(host.getByLabel("Prompt theme")).toBeVisible();
      await host.getByLabel("Prompt theme").selectOption({ label: "Food" });
      await expect(host.getByLabel("Prompt theme")).toHaveValue("food");

      await host.getByRole("button", { name: "Start game" }).click();

      await expect(host.getByRole("heading", { name: "Draw this" })).toBeVisible();
      await expect(host.getByText("Previous prompt")).toBeVisible();
      await expect(host.getByRole("button", { name: "Submit prompt" })).toHaveCount(0);
      await expect(guestOne.getByRole("heading", { name: "Draw this" })).toBeVisible();
    } finally {
      await hostContext.close();
      await guestOneContext.close();
      await guestTwoContext.close();
    }
  });

  test("creates, joins, starts, submits, advances, and reveals", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run the full multiplayer path once");

    const hostContext = await browser.newContext();
    const guestOneContext = await browser.newContext();
    const guestTwoContext = await browser.newContext();

    try {
      const host = await hostContext.newPage();
      const guestOne = await guestOneContext.newPage();
      const guestTwo = await guestTwoContext.newPage();

      await host.goto("/");
      await host.getByPlaceholder("Maya").fill("E2E Host");
      await host.getByRole("button", { name: "Create room" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z2-9]{4}$/);

      const roomUrl = host.url();

      await joinRoom(guestOne, roomUrl, "E2E Two");
      await joinRoom(guestTwo, roomUrl, "E2E Three");

      await expect(host.getByText("3/15 players joined")).toBeVisible();
      await host.getByRole("button", { name: "Start game" }).click();

      await submitPrompt(host, "A roadmap in a wind tunnel");
      await submitPrompt(guestOne, "A coffee machine doing standup");
      await submitPrompt(guestTwo, "A whiteboard full of tiny rockets");

      await expect(host.getByRole("heading", { name: "Draw this" })).toBeVisible();
      await expect(host.getByText(/^1:(2\d|30)$/).first()).toBeVisible();
      await expect(host.getByText("A whiteboard full of tiny rockets")).toBeVisible();
      await expect(host.getByText("A roadmap in a wind tunnel")).toHaveCount(0);
      await expect(host.getByText("A coffee machine doing standup")).toHaveCount(0);

      await submitDrawing(host);
      await submitDrawing(guestOne);
      await submitDrawing(guestTwo);

      await expect(host.getByRole("heading", { name: "Guess this" })).toBeVisible();
      await expect(host.getByText(/^(0:5\d|1:00)$/).first()).toBeVisible();
      await expect(host.getByText("Previous drawing")).toBeVisible();

      await submitGuess(host, "A rocket whiteboard");
      await submitGuess(guestOne, "A roadmap in a wind tunnel");
      await submitGuess(guestTwo, "A coffee machine doing standup");

      await expect(host.getByRole("heading", { name: "Final reveal" })).toBeVisible();
      await expect(host.getByRole("button", { name: /Chain 1/ })).toBeVisible();
      await expect(host.getByText("A roadmap in a wind tunnel")).toBeVisible();
      await expect(host.getByText("A coffee machine doing standup")).toBeVisible();
      await host.getByRole("button", { name: /Chain 3/ }).click();
      await expect(host.getByText("A whiteboard full of tiny rockets")).toBeVisible();
    } finally {
      await hostContext.close();
      await guestOneContext.close();
      await guestTwoContext.close();
    }
  });
});

async function joinRoom(page: Page, roomUrl: string, displayName: string) {
  await page.goto(roomUrl);
  await page.getByPlaceholder("Taylor").fill(displayName);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: "Joined" })).toBeVisible();
}

async function submitPrompt(page: Page, prompt: string) {
  await expect(page.getByRole("heading", { name: "Write a prompt" })).toBeVisible();
  await page.getByPlaceholder("A project kickoff on roller skates").fill(prompt);
  await page.getByRole("button", { name: "Submit prompt" }).click();
  await expect(page.getByRole("button", { name: "Submit prompt" })).toHaveCount(0);
}

async function submitDrawing(page: Page) {
  await expect(page.getByRole("heading", { name: "Draw this" })).toBeVisible();
  await page.getByTestId("drawing-canvas-element").click();
  await expect(page.getByTestId("drawing-status")).toContainText("1 stroke");
  await page.getByRole("button", { name: "Submit drawing" }).click();
  await expect(page.getByRole("button", { name: "Submit drawing" })).toHaveCount(0);
}

async function submitGuess(page: Page, guess: string) {
  await expect(page.getByRole("heading", { name: "Guess this" })).toBeVisible();
  await page.getByPlaceholder("Type what you see").fill(guess);
  await page.getByRole("button", { name: "Submit guess" }).click();
}
