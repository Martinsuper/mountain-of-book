import { test, expect } from '@playwright/test';

// Opt-in: real project, fresh anonymous browser contexts. No email or mutations.
test.describe('真实项目匿名浏览器验收', () => {
  test.skip(process.env.ACCOUNT_LIVE_TEST !== '1', 'Opt in with ACCOUNT_LIVE_TEST=1');
  test('登录页可用且不会自动发送邮件', async ({ page }) => {
    let emailRequests = 0;
    page.on('request', request => { if (request.url().includes('/auth/v1/otp')) emailRequests++; });
    await page.goto('/account/');
    await expect(page.locator('#account-status')).toHaveText('请先登录。', { timeout: 20000 });
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#account-private')).toBeHidden();
    expect(emailRequests).toBe(0);
  });
  test('游客直接进入受限文章不显示正文', async ({ page }) => {
    await page.goto('/members/read/?id=00000000-0000-0000-0000-000000000000');
    await expect(page.locator('#account-status')).toContainText(/需要登录|加载失败/, { timeout: 20000 });
    await expect(page.locator('#private-body')).toBeEmpty();
    await expect(page.locator('#private-article')).toBeHidden();
  });
  test('游客无法进入管理表单', async ({ page }) => {
    for (const path of ['/account/admin/']) {
      await page.goto(path);
      await expect(page.locator('#account-status')).toHaveText('请先到个人中心登录。', { timeout: 20000 });
      await expect(page.locator('#admin-panel')).not.toBeVisible();
      if (await page.locator('#member-articles').count()) await expect(page.locator('#member-articles')).toBeEmpty();
    }
  });
});
