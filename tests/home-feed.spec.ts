import { test, expect } from '@playwright/test';

const mockURL = 'https://account-test.supabase.co';
const configured = process.env.PUBLIC_SUPABASE_URL === mockURL;
const cloud = { id: '11111111-1111-4111-8111-111111111111', title: 'Synthetic newest cloud article', visibility: 'public', created_at: '2099-01-01T00:00:00Z' };

test.describe('首页一次性展示完整列表', () => {
  test.skip(!configured, 'Requires the isolated mock Supabase server.');

  test('请求期间只显示骨架屏，完成后混排且初始化仅查询一次', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let requests = 0;
    await page.route(`${mockURL}/rest/v1/articles?**`, async route => {
      requests++;
      await gate;
      await route.fulfill({ json: [cloud] });
    });
    await page.goto('/');
    await expect.poll(() => requests).toBe(1);
    await expect(page.locator('#home-posts')).toBeHidden();
    await expect(page.locator('#home-feed-loading')).toBeVisible();
    release();
    await expect(page.locator('#home-posts')).toBeVisible();
    await expect(page.locator('#home-posts > li').first()).toContainText(cloud.title);
    await expect(page.locator('#home-feed-loading')).toBeHidden();
    await page.waitForTimeout(300);
    expect(requests).toBe(1);
  });

  test('失败展示本地文章，点击重试后才能补入云端文章', async ({ page }) => {
    let failed = true;
    await page.route(`${mockURL}/rest/v1/articles?**`, route => route.fulfill(
      failed ? { status: 400, json: { message: 'Feed query failed' } } : { json: [cloud] },
    ));
    await page.goto('/');
    await expect(page.locator('#cloud-feed-status')).toContainText('暂时无法加载');
    await expect(page.locator('#home-posts')).toBeVisible();
    await expect(page.locator('#home-posts > li').first()).toBeVisible();
    await expect(page.locator('#home-feed-loading')).toBeHidden();
    failed = false;
    await page.getByRole('button', { name: '重试加载' }).click();
    await expect(page.locator('#home-posts > li').first()).toContainText(cloud.title);
    await expect(page.getByRole('button', { name: '重试加载' })).toBeHidden();
  });

  test('超时后稳定展示本地文章，迟到的响应不会重排列表', async ({ page }) => {
    await page.clock.install();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let started = false;
    await page.route(`${mockURL}/rest/v1/articles?**`, async route => {
      started = true;
      await gate;
      await route.fulfill({ json: [cloud] }).catch(() => {});
    });
    await page.goto('/');
    await expect.poll(() => started).toBe(true);
    await page.clock.fastForward(8100);
    await expect(page.locator('#home-posts')).toBeVisible();
    await expect(page.getByRole('button', { name: '重试加载' })).toBeVisible();
    release();
    await page.waitForTimeout(300);
    await expect(page.locator('#home-posts')).not.toContainText(cloud.title);
    await expect(page.locator('#home-feed-loading')).toBeHidden();
  });

  test('禁用 JavaScript 仍可阅读本地文章', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.locator('#home-posts > li').first()).toBeVisible();
    await expect(page.locator('#home-feed-loading')).toBeHidden();
    await context.close();
  });
});
