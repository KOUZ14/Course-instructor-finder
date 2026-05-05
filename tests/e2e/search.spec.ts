import { expect, test } from "@playwright/test";

test("student searches CS 146 and sees likely instructors", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Subject").fill("CS");
  await page.getByLabel("Course number").fill("146");
  await page.getByRole("button", { name: "Find likely instructors" }).click();

  const taylorNguyenResult = page.getByRole("article").filter({ hasText: "Taylor Nguyen" });

  await expect(taylorNguyenResult).toBeVisible();
  await expect(taylorNguyenResult.getByText("High confidence")).toBeVisible();
  await expect(taylorNguyenResult.getByText(/Fall 2025/)).toBeVisible();
});
