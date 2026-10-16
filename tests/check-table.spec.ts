import { test, expect } from '@playwright/test';

test('手机表格在自身容器横向滚动，页面不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/posts/mimo-code-ai-coding-agent.md/');

  const table = page.locator('article.prose table').first();
  await expect(table).toBeVisible();
  await expect(table.locator('th')).toHaveText(['属性', '详情']);
  await expect(table).toHaveCSS('overflow-x', 'auto');

  // 当前概览表可能不够宽；仅在浏览器 DOM 加入压力数据，验证滚动而非依赖文章长度。
  await table.locator('td').last().evaluate(cell => {
    const longValue = document.createElement('span');
    longValue.style.whiteSpace = 'nowrap';
    longValue.textContent = 'table-scroll-regression-'.repeat(30);
    cell.append(longValue);
  });
  await expect.poll(() => table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await table.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect.poll(() => table.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);

  const bounds = await table.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
  await expect.poll(() => page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
  )).toBeLessThanOrEqual(1);
});
