import { test, expect } from '@playwright/test';

test('桌面导航顺序、胶囊尺寸及下拉交互统一', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const navigation = page.locator('#desktop-navigation');
  await expect(navigation).toBeVisible();
  await expect(navigation.locator(':scope > a, :scope > .nav-group > button')).toHaveText(['首页', '文章', '账号']);
  const boxes = await navigation.locator(':scope > a, :scope > .nav-group > button').evaluateAll(items => items.map(item => ({
    height: item.getBoundingClientRect().height,
    radius: getComputedStyle(item).borderRadius,
    font: getComputedStyle(item).fontSize,
  })));
  for (const box of boxes) expect(box).toEqual(boxes[0]);
  const tools = await page.locator('#header-tools').boundingBox();
  const nav = await navigation.boundingBox();
  expect(tools!.x).toBeGreaterThanOrEqual(nav!.x + nav!.width);
  const article = navigation.getByRole('button', { name: '文章', exact: true });
  const account = navigation.getByRole('button', { name: '账号与个人中心' });
  await article.click();
  await expect(article).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#posts-menu')).toBeVisible();
  await account.click();
  await expect(article).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#posts-menu')).not.toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#account-menu a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await account.click();
  await page.locator('main h1').click();
  await expect(page.locator('#account-menu')).not.toBeVisible();
});

test('移动顶栏不重复展示账号，汉堡菜单账号入口可达', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '账号与个人中心' })).not.toBeVisible();
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-menu a[href="/account/"]')).toBeVisible();
  await expect(page.locator('#mobile-menu a[href="/account/admin/"]')).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
