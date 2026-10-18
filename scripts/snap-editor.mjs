import { chromium } from '@playwright/test';

// Visual check of the admin editor (mock Supabase, signed-in admin).
// Run: PUBLIC_SUPABASE_URL=https://account-test.supabase.co PUBLIC_SUPABASE_ANON_KEY=public-test-key node scripts/snap-editor.mjs
const base = 'http://127.0.0.1:4322';
const userID = '11111111-1111-4111-8111-111111111111';
const articleID = '22222222-2222-4222-8222-222222222222';
const privateTitle = '测试文章 · 编辑器视觉走查';
const privateText = '这是用于视觉走查的正文。'.repeat(20);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('https://account-test.supabase.co/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
  const respond = (body, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (path === '/rest/v1/rpc/is_site_admin') return respond(true);
  if (path === '/rest/v1/articles') {
    if (request.method() === 'GET') {
      if (!request.headers().authorization?.includes('synthetic')) return respond(url.searchParams.has('id') ? null : []);
      const article = { id: articleID, title: privateTitle, status: 'draft', visibility: 'authenticated', created_at: '2099-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', body: `## 小标题\n\n${privateText}\n\n- 列表项一\n- 列表项二\n\n> 一段引用文字。\n\n\`\`\`text\nconst ok = true;\n\`\`\`` };
      return respond(url.searchParams.has('id') ? article : [article]);
    }
  }
  if (path === '/rest/v1/user_todos') return respond([]);
  if (/^\/rest\/v1\/(reading_history|bookmarks|article_grants)$/.test(path)) return respond([]);
  return respond({});
});
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const expires = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userID, aud: 'authenticated', role: 'authenticated', exp: expires })}.synthetic-signature`;
const user = { id: userID, aud: 'authenticated', role: 'authenticated', email: 'reader@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const storageKey = 'sb-account-test-auth-token';
await page.addInitScript(({ user, token, expires, storageKey }) => {
  localStorage.setItem(storageKey, JSON.stringify({ access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: expires, user }));
}, { user, token, expires, storageKey });

await page.goto(`${base}/account/admin/`);
await page.waitForSelector('#admin-panel:not([hidden])', { timeout: 15000 });
await page.getByText('编辑', { exact: true }).first().click();
await page.waitForSelector('#writing-view:not([hidden])', { timeout: 15000 });
await page.waitForTimeout(400);
// 清空正文聚焦标题，得到接近原截图的状态
await page.fill('input[name=title]', '');
await page.fill('textarea[name=body]', '');
await page.focus('input[name=title]');
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/editor-immersive-write.png' });
await page.fill('textarea[name=body]', '## 小标题\n\n在这里写下一句开场的话，观察纸面的呼吸感与行距。\n\n- 列表一\n- 列表二\n\n> 引用保持安静。\n');
await page.click('.view-tools [data-view=split]');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/editor-immersive-split.png' });
await page.click('.view-tools [data-view=preview]');
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/editor-immersive-preview.png' });
// 移动端布局
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/editor-immersive-mobile.png' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
// 深色模式（站点主题由手动按钮切换）
await page.click('.view-tools [data-view=write]');
await page.waitForTimeout(300);
const themeButton = page.locator('button').filter({ hasText: '主题' }).first();
await themeButton.click();
await page.getByText('深色', { exact: true }).click();
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/editor-immersive-dark.png' });
// 移动端
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.waitForTimeout(200);
await browser.close();
console.log('screenshots saved');
