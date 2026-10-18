import { chromium } from '@playwright/test';

// Fullscreen mode functional check (admin editor).
const base = 'http://127.0.0.1:4322';
const browser = await chromium.launch();
const page = await browser.newPage({ args: ['--start-fullscreen'] });
await page.route('https://account-test.supabase.co/**', async route => {
  const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  const respond = body => route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  const path = new URL(route.request().url()).pathname;
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (path === '/rest/v1/rpc/is_site_admin') return respond(true);
  if (path === '/rest/v1/articles') {
    const article = { id: 'x', title: '全屏测试', status: 'draft', visibility: 'authenticated', created_at: '2099-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', body: '正文' };
    return respond(new URL(route.request().url()).searchParams.has('id') ? article : [article]);
  }
  return respond([]);
});
const userID = 'u';
const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userID, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.s`;
await page.addInitScript(token => {
  localStorage.setItem('sb-account-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u', role: 'authenticated' } }));
}, token);
await page.goto(`${base}/account/admin/`);
await page.waitForSelector('#admin-panel:not([hidden])');
await page.getByText('编辑', { exact: true }).first().click();
await page.waitForSelector('#writing-view:not([hidden])');
await page.click('#fullscreen-editor');
await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
console.log('enter fullscreen: ok, aria-pressed =', await page.getAttribute('#fullscreen-editor', 'aria-pressed'));
console.log('header hidden in fullscreen =', await page.evaluate(() => getComputedStyle(document.querySelector('body>header')).display));
console.log('body class =', await page.evaluate(() => document.body.className));
await page.screenshot({ path: 'test-results/editor-fullscreen.png', fullPage: false });
// Esc 在无头环境不可用，用按钮再切一次验证退出
await page.click('#fullscreen-editor');
await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
console.log('exit fullscreen (button): ok, aria-pressed =', await page.getAttribute('#fullscreen-editor', 'aria-pressed'));
// 返回列表应自动退出全屏
await page.click('#fullscreen-editor');
await page.waitForFunction(() => Boolean(document.fullscreenElement));
await page.click('#back-to-list');
await page.waitForFunction(() => !document.fullscreenElement);
console.log('back-to-list exits fullscreen: ok');
await browser.close();
