import { expect, test } from "@playwright/test";

test("student searches CS 146 and sees likely instructors", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Subject").fill("CS");
  await page.getByLabel("Course number").fill("146");
  await page.getByRole("button", { name: "Find likely instructors" }).click();

  const topResult = page.getByRole("article").filter({ hasText: "David Taylor" });

  await expect(topResult).toBeVisible();
  await expect(topResult.getByText("High confidence")).toBeVisible();
  await expect(topResult.getByText(/Spring 2026|Fall 2025/).first()).toBeVisible();
});
