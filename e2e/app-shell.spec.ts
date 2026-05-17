import { expect, type Page, test } from "@playwright/test";

test.describe("app shell", () => {
  test("shows the active draw and guess tasks without reveal history", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Telestrations" })).toBeVisible();
    await expect(page.getByText("Room F7K2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
    await expect(page.getByText("10/15")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Draw this" })).toBeVisible();
    await expect(page.getByText("Previous guess")).toBeVisible();
    await expect(page.getByText("A calendar invite that got way too serious")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Guess state" })).toBeVisible();
    await expect(page.getByText("Previous drawing")).toBeVisible();
    await expect(page.getByPlaceholder("Type what you see")).toBeVisible();

    await expect(page.getByText(/Full chain|Chain history|Complete sequence/i)).toHaveCount(0);
  });

  test("does not horizontally overflow the viewport", async ({ page }) => {
    await page.goto("/");

    await expectNoHorizontalOverflow(page);
  });

  test("keeps the drawing surface mobile-ready", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile viewport contract");

    await page.goto("/");

    await expect(page.getByTestId("drawing-toolbar")).toBeVisible();

    const canvas = page.getByTestId("drawing-canvas");
    await expect(canvas).toBeVisible();

    const metrics = await canvas.evaluate((element) => {
      const box = element.getBoundingClientRect();

      return {
        canvasWidth: box.width,
        touchAction: getComputedStyle(element).touchAction,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    expect(metrics.canvasWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.touchAction).toBe("none");
    await expectNoHorizontalOverflow(page);
  });

  test("supports a local drawing stroke with undo, redo, clear, and PNG export", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.getByTestId("drawing-canvas-element");
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box === null) {
      return;
    }

    await expect(page.getByTestId("drawing-status")).toContainText("0 strokes");

    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.55, { steps: 8 });
    await page.mouse.up();

    await expect(page.getByTestId("drawing-status")).toContainText("1 stroke");
    const exportStatus = page.getByTestId("drawing-export-status");
    await expect(exportStatus).toContainText("PNG ready");
    await expect(exportStatus).toHaveAttribute("data-mime-type", "image/png");

    await page.getByRole("button", { name: "Undo stroke" }).click();
    await expect(page.getByTestId("drawing-status")).toContainText("0 strokes");

    await page.getByRole("button", { name: "Redo stroke" }).click();
    await expect(page.getByTestId("drawing-status")).toContainText("1 stroke");

    await page.getByRole("button", { name: "Clear drawing" }).click();
    await expect(page.getByTestId("drawing-status")).toContainText("0 strokes");

    await page.getByRole("button", { name: "Undo stroke" }).click();
    await expect(page.getByTestId("drawing-status")).toContainText("1 stroke");
  });

  test("renders the room route shell", async ({ page }) => {
    await page.goto("/room/F7K2");

    await expect(page.getByRole("heading", { level: 1, name: "Telestrations" })).toBeVisible();
    await expect(page.getByText("Room F7K2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy invite link" })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}
