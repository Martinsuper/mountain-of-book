import { test, expect } from '@playwright/test';

test('检查表格渲染效果', async ({ page }) => {
  await page.goto('http://localhost:4321/posts/mimo-code-ai-coding-agent.md/');
  await page.waitForLoadState('networkidle');
  
  // 强制刷新CSS缓存
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  const table = page.locator('article.prose table').first();
  await expect(table).toBeVisible();
  
  // 检查表格实际样式
  const styles = await table.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      display: computed.display,
      overflowX: computed.overflowX,
      width: computed.width,
      minWidth: computed.minWidth,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isOverflowing: el.scrollWidth > el.clientWidth,
    };
  });
  console.log('Table styles:', JSON.stringify(styles, null, 2));
  
  // 检查"安装"行代码
  const installCode = page.locator('article.prose td code').filter({ hasText: 'curl' }).first();
  if (await installCode.count() > 0) {
    const codeStyles = await installCode.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        whiteSpace: computed.whiteSpace,
        wordBreak: computed.wordBreak,
      };
    });
    console.log('Code styles:', JSON.stringify(codeStyles, null, 2));
  }
  
  // 截图
  await table.screenshot({ path: '/tmp/table-screenshot.png' });
  await page.screenshot({ path: '/tmp/full-page.png', fullPage: true });
  
  console.log('Screenshots saved');
});
