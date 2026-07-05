import { expect, type Page, test } from "@playwright/test";

test.describe("app shell", () => {
  test("shows focused create and join paths without gameplay panels", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Pass the Doodle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Join a room" })).toBeVisible();
    await expect(page.getByPlaceholder("Maya")).toBeVisible();
    await expect(page.getByPlaceholder("F7K2 or paste a room link")).toBeVisible();

    await expect(
      page.getByText(/Draw this|Guess state|Previous drawing|Chain history/i),
    ).toHaveCount(0);
  });

  test("does not horizontally overflow the viewport", async ({ page }) => {
    await page.goto("/");

    await expectNoHorizontalOverflow(page);
  });

  test("routes room codes and pasted room links to room pages", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("F7K2 or paste a room link").fill("https://draw.team/room/f7k2");
    await page.getByRole("button", { name: "Join room" }).click();

    await expect(page).toHaveURL(/\/room\/F7K2$/);
  });

  test("renders the room route shell", async ({ page }) => {
    await page.goto("/room/F7K2");

    await expect(page.getByRole("heading", { level: 1, name: "Pass the Doodle" })).toBeVisible();
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
