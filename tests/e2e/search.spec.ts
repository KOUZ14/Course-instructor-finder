import { expect, test } from "@playwright/test";

test("student searches CS 146 and sees likely instructors", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Subject").fill("CS");
  await page.getByLabel("Course number").fill("146");
  await page.getByRole("button", { name: "Find likely instructors" }).click();

  await expect(page.getByText("Taylor Nguyen")).toBeVisible();
  await expect(page.getByText("High confidence")).toBeVisible();
  await expect(page.getByText(/Fall 2025/).first()).toBeVisible();
});
