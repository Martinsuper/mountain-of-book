import { test, expect } from '@playwright/test';

test('桌面导航顺序、胶囊尺寸及下拉交互统一', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const navigation = page.locator('#desktop-navigation');
  await expect(navigation).toBeVisible();
  await expect(navigation.locator(':scope > a, :scope > .nav-group > button')).toHaveText(['首页', '文章', '待办']);
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
  await article.click();
  await expect(article).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#posts-menu')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#posts-menu a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(article).toBeFocused();
  await expect(article).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#header-user [data-user-guest]')).toHaveText('登录');
  await expect(page.getByRole('button', { name: '用户菜单' })).not.toBeVisible();
  await expect(page.locator('#account-menu a[href="/account/admin/"]')).not.toBeVisible();
  await article.click();
  await page.locator('main h1').click();
  await expect(page.locator('#posts-menu')).not.toBeVisible();
});

test('移动端待办直接可达，个人入口置底且隐藏管理操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '用户菜单' })).not.toBeVisible();
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-menu a[href="/todo/"]')).toBeVisible();
  await expect(page.locator('#mobile-menu [data-user-guest]')).toHaveText('登录');
  await expect(page.locator('#mobile-menu a[href="/account/admin/"]')).not.toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
