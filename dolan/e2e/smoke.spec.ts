import { expect, test } from "@playwright/test";

test.describe("Dolan smoke", () => {
  test("homepage search UI and explore bottom sheet controls render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const search = page.getByLabel(/Kota, wisata, atau provinsi|Cari petualangan/i).first();
    await expect(search).toBeVisible();

    await page.goto("/jelajah");
    await expect(page.getByPlaceholder(/Cari wisata/i).first()).toBeVisible({ timeout: 20_000 });
    // Bottom sheet drag handle / list affordance on mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel(/Tarik daftar hasil/i)).toBeVisible({ timeout: 15_000 });
  });

  test("reduced motion does not break homepage", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
