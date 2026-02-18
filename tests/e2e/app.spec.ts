import { test, expect } from "@playwright/test";

test("home renders key sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hud-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /J1 - Fontainebleau - Chissey-en-Morvan/i })).toBeVisible();
  await expect(page.getByTestId("legend-panel")).toBeVisible();
  await expect(page.getByTestId("map-container")).toBeVisible();
  await expect(page.getByTestId("elevation-profile")).toBeVisible();
  await expect(page.getByTestId("profile-overlay")).toBeVisible();
});
