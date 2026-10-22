import { test, expect } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} 阅读入口在手机与桌面不溢出，移动菜单不推动正文`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.route('**/rest/v1/articles?**', route => route.fulfill({ json: [] }));
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await expect(page.locator('#home-filter')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) {
        const before = await page.locator('main').boundingBox();
        await page.getByRole('button', { name: '菜单', exact: true }).click();
        await expect(page.locator('#mobile-menu')).toHaveClass(/open/);
        await expect.poll(() => page.locator('#mobile-menu').evaluate(el => el.getAnimations().length)).toBe(0);
        const after = await page.locator('main').boundingBox();
        expect(after!.y).toBe(before!.y);
        await expect(page.locator('#mobile-menu a[aria-current="page"]')).toHaveText('首页');
        await page.screenshot({ path: `test-results/ui-menu-${colorScheme}.png` });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '菜单', exact: true })).toBeFocused();
        await expect.poll(() => page.locator('#mobile-menu').evaluate(el => el.getAnimations().length)).toBe(0);
      }
      await page.screenshot({ path: `test-results/ui-home-${width}-${colorScheme}.png` });
      await page.getByRole('button', { name: '搜索文章' }).click();
      await page.getByRole('searchbox').fill('Agent');
      await expect(page.locator('#search-results mark').first()).toHaveText(/agent/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/ui-search-${width}-${colorScheme}.png` });
    }
  });
}
