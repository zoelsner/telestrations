import { expect, type Page, test } from "@playwright/test";

test.describe("self-service seat reclaim", () => {
  test("lets a fresh device reclaim a disconnected seat mid-drawing-turn", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run the real presence timeout once");
    test.setTimeout(90_000);

    const hostContext = await browser.newContext();
    const guestOneContext = await browser.newContext();
    const guestTwoContext = await browser.newContext();
    let reclaimerContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;

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

      // Kill guestTwo mid-drawing-turn (stops its heartbeat) while its
      // drawing assignment is still pending.
      await guestTwoContext.close();

      // Fresh device: new context = empty localStorage = new player token.
      reclaimerContext = await browser.newContext();
      const reclaimer = await reclaimerContext.newPage();
      await reclaimer.goto(roomUrl);

      // Probe: connected seats are never offered.
      await expect(reclaimer.getByRole("button", { name: /Reclaim E2E Host's seat/ })).toHaveCount(
        0,
      );
      await expect(reclaimer.getByRole("button", { name: /Reclaim E2E Two's seat/ })).toHaveCount(
        0,
      );

      // Wait for the dead seat to go stale (real presence timeout).
      await expect(reclaimer.getByRole("button", { name: /Reclaim E2E Three's seat/ })).toBeVisible(
        { timeout: 60_000 },
      );
      await expect(reclaimer.getByText("Were you already playing?")).toBeVisible();

      await reclaimer.getByRole("button", { name: /Reclaim E2E Three's seat/ }).click();

      await expect(reclaimer.getByRole("heading", { name: "Draw this" })).toBeVisible();

      await submitDrawing(host);
      await submitDrawing(guestOne);
      await submitDrawing(reclaimer);

      await expect(host.getByRole("heading", { name: "Guess this" })).toBeVisible();
    } finally {
      await hostContext.close();
      await guestOneContext.close();
      await reclaimerContext?.close();
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
