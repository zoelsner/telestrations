import { expect, test } from "@playwright/test";

// Regression for issue #100: on phones, the drawing toolbar's swatch row forced
// the shared grid track (and the canvas) wider than the viewport, so the whole
// game screen panned horizontally. Uses the Convex-free harness route so layout
// runs on every project without driving a full multiplayer game.
test.describe("drawing surface layout", () => {
  test("keeps the drawing turn inside the viewport", async ({ page }) => {
    await page.goto("/dev/drawing-surface");

    await expect(page.getByTestId("drawing-canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pass it on" })).toBeVisible();

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

    const canvasBox = await page.getByTestId("drawing-canvas-element").boundingBox();

    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.x).toBeGreaterThanOrEqual(0);
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });
});
