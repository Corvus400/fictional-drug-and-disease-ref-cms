import { expect, test } from "@playwright/test";

test("renders the local CMS shell and resource navigation", async ({ page }) => {
  await page.route("http://127.0.0.1:19090/v1/admin/token", async (route) => {
    await route.fulfill({ json: { token: "playwright-token" } });
  });
  await page.route("http://127.0.0.1:19090/v1/drugs**", async (route) => {
    await route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalCount: 0,
      },
    });
  });

  await page.goto("/");

  await expect(page.getByRole("link", { name: "架空医薬品・疾患リファレンス CMS" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "リソース" }).getByRole("link", { name: "医薬品" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "リソース" }).getByRole("link", { name: "疾患" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "医薬品一覧" })).toBeVisible();
});
