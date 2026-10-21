import { test, expect as baseExpect, type Page, type Request } from '@playwright/test';

// Cold Vite dependency optimization can delay the first account module load.
const expect = baseExpect.configure({ timeout: 15_000 });

// Run the default suite without PUBLIC_SUPABASE_* set. Mock integration mode:
// PUBLIC_SUPABASE_URL=https://account-test.supabase.co PUBLIC_SUPABASE_ANON_KEY=public-test-key pnpm test tests/account.spec.ts
// Stop any existing server on 4322 first: Playwright otherwise reuses its old environment.
const configured = Boolean(process.env.PUBLIC_SUPABASE_URL?.trim() && process.env.PUBLIC_SUPABASE_ANON_KEY?.trim());
// Opt-in local UI mode intercepts ALL requests to the real project in a fresh browser context.
// It exercises the already running local server without a real session or cloud writes.
const localUIMode = process.env.ACCOUNT_UI_LOCAL === '1';
const mockURL = localUIMode ? process.env.PUBLIC_SUPABASE_URL!.replace(/\/$/, '') : 'https://account-test.supabase.co';
const mockMode = configured && process.env.PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === mockURL;
const configurationMessage = '账号服务尚未配置。请按部署说明设置 Supabase 公开环境变量并重新构建站点。';
const articleID = '11111111-1111-4111-8111-111111111111';
const userID = '22222222-2222-4222-8222-222222222222';
const privateTitle = 'E2E synthetic restricted article';
const privateText = 'E2E synthetic confidential paragraph';
const routes = [
  { path: '/account/', title: '个人中心' },
  { path: '/members/read/', title: '' },
  { path: '/posts/read/', title: '' },
  { path: '/account/admin/', title: '文章管理' },
];

async function expectNoPrivateUI(page: Page) {
  for (const selector of ['#account-private', '#private-article', '#admin-panel', '#grant-panel']) {
    await expect(page.locator(selector)).not.toBeVisible();
  }
  for (const selector of ['#member-articles', '#user-todos', '#bookmarks', '#admin-articles', '#article-grants', '#private-title', '#private-body']) {
    if (await page.locator(selector).count()) await expect(page.locator(selector)).toBeEmpty();
  }
  await expect(page.getByRole('button', { name: /注册|sign up|signup/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /注册|sign up|signup/i })).toHaveCount(0);
}

test.describe('账号页面：未配置时安全降级', () => {
  test.skip(configured, 'This suite requires a server started without Supabase public environment variables.');

  for (const route of routes) {
    test(`${route.path} 显示配置状态，隐藏表单及私有内容`, async ({ page }) => {
      const backendRequests: string[] = [];
      await page.route('**/*', async intercepted => {
        if (/\/auth\/v1\/|\/rest\/v1\//.test(intercepted.request().url())) {
          backendRequests.push(intercepted.request().url());
          await intercepted.abort();
        } else await intercepted.continue();
      });
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      if (route.title) await expect(page.getByRole('heading', { name: route.title, exact: true })).toBeVisible();
      await expect(page.locator('#account-status')).toHaveText(configurationMessage);
      await expectNoPrivateUI(page);
      await expect(page.locator('.account-shell form:visible')).toHaveCount(0);
      await expect(page.locator('.account-shell input:visible, .account-shell textarea:visible')).toHaveCount(0);
      expect(backendRequests).toEqual([]);
    });
  }

  test('配置提示优先于缺失、无效及恶意文章 ID', async ({ page }) => {
    for (const query of ['', '?id=not-a-uuid', '?id=' + encodeURIComponent('<script>alert(1)</script>'), `?id=${articleID}`]) {
      await page.goto(`/members/read/${query}`);
      await expect(page.locator('#account-status')).toHaveText(configurationMessage);
      await expect(page.locator('#account-status')).not.toHaveText('文章地址无效。');
      await expectNoPrivateUI(page);
    }
  });

  test('主页可进入个人中心，账号导航可达且不会暴露管理表单', async ({ page }) => {
    await page.goto('/');
    await page.locator('header button[aria-controls="account-menu"]').click();
    await page.locator('#account-menu a[href="/account/"]').click();
    await expect(page).toHaveURL(/\/account\/$/);
    for (const route of [routes.find(route => route.path === '/account/admin/')!, routes[0]]) {
      await page.locator('header button[aria-controls="account-menu"]').click();
      await page.locator(`#account-menu a[href="${route.path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(page.locator('#account-status')).toHaveText(configurationMessage);
      await expectNoPrivateUI(page);
    }
  });
});

// Only synthetic data in test code; never put restricted fixtures in public/ or src/content/.
// Raw HTML must stay an empty shell, even in configured mode (before browser auth).
test('账号静态 HTML 不包含用户记录、受限正文或编辑器预填数据', async ({ page, request }) => {
  await page.goto('/');
  for (const route of routes) {
    const response = await request.get(route.path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).not.toContain(privateTitle);
    expect(html).not.toContain(privateText);
    expect(html).not.toContain('reader@example.invalid');
    const shell = await page.evaluate(source => {
      const document = new DOMParser().parseFromString(source, 'text/html');
      return {
        records: [...document.querySelectorAll('#member-articles, #user-todos, #bookmarks, #admin-articles, #article-grants, #private-title, #private-body')].map(element => element.textContent?.trim()),
        panelsHidden: [...document.querySelectorAll('#account-private, #private-article, #admin-panel, #grant-panel, #login-form')].every(element => element.hasAttribute('hidden')),
        values: [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.account-shell input:not([type="hidden"]), .account-shell textarea')].map(element => element.value),
      };
    }, html);
    expect(shell.records.every(value => !value)).toBe(true);
    expect(shell.panelsHidden).toBe(true);
    expect(shell.values.every(value => !value)).toBe(true);
  }
});

type MockOptions = { signedIn?: boolean; admin?: boolean; denied?: boolean; visibility?: string; draft?: boolean };
async function mockSupabase(page: Page, options: MockOptions = {}) {
  const requests: Request[] = [];
  const unexpected: string[] = [];
  let todos = [{ id: 'synthetic-todo', title: 'Synthetic personal task', completed: false, quadrant: 1, priority: 'medium' }];
  let grants: { user_id: string }[] = [];
  let articles = [{ id: articleID, title: privateTitle, status: options.draft ? 'draft' : 'published', visibility: options.visibility || 'restricted', created_at: '2099-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', body: `## Test section\n\n${privateText}\n\n<script>window.__privateXss = true</script>\n\n<img src="https://private-image.invalid/secret.png" onerror="window.__privateXss = true">\n\n[unsafe](javascript:alert(1))\n\n[safe](https://example.invalid/reference)` }];
  const user = { id: userID, aud: 'authenticated', role: 'authenticated', email: 'reader@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  if (options.signedIn) {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userID, aud: 'authenticated', role: 'authenticated', exp: expires })}.synthetic-signature`;
    const storageKey = `sb-${new URL(mockURL).hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({ user, token, expires, storageKey }) => {
      // Seed once per tab, so sign-out/reload cannot resurrect the test session.
      if (sessionStorage.getItem('account-e2e-seeded')) return;
      localStorage.setItem(storageKey, JSON.stringify({ access_token: token, refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expires, user }));
      sessionStorage.setItem('account-e2e-seeded', '1');
    }, { user, token, expires, storageKey });
  }
  await page.route(`${mockURL}/**`, async route => {
    const request = route.request();
    requests.push(request);
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    const respond = (body: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      if (request.postDataJSON().password !== 'Test-password-123!') return respond({ message: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400);
      const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const expires = Math.floor(Date.now() / 1000) + 3600;
      return respond({ access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userID, exp: expires, role: 'authenticated' })}.synthetic-signature`, refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expires, user });
    }
    if (path === '/auth/v1/recover') return respond({});
    if (path === '/auth/v1/user') return respond(request.method() === 'PUT' ? { user } : user);
    if (path === '/auth/v1/otp') return respond({});
    if (/^\/auth\/v1\/passkeys/.test(path)) {
      if (request.method() === 'GET') return respond([]);
      return respond(null);
    }
    if (path === '/auth/v1/logout') return respond({});
    if (path === '/rest/v1/rpc/is_site_admin') return respond(Boolean(options.admin));
    if (path === '/rest/v1/rpc/admin_grant_article') {
      grants = [{ user_id: userID }];
      return respond(null);
    }
    if (path === '/rest/v1/article_grants') {
      if (request.method() === 'DELETE') { grants = []; return respond(null); }
      if (request.method() === 'GET') return respond(grants);
    }
    if (path === '/rest/v1/articles') {
      if (request.method() === 'GET') {
        if (options.denied || (!request.headers().authorization?.endsWith('.synthetic-signature') && options.visibility !== 'public')) return respond(url.searchParams.has('id') ? null : []);
        return respond(url.searchParams.has('id') ? articles[0] ?? null : articles.filter(row => !url.searchParams.has('status') || url.searchParams.get('status') === `eq.${row.status}`));
      }
      if (request.method() === 'POST') {
        articles = [{ ...articles[0], ...request.postDataJSON(), id: articleID, updated_at: '2026-01-02T00:00:00Z' }];
        return respond([{ id: articleID }], 201);
      }
      if (request.method() === 'PATCH') {
        articles = articles.map(article => ({ ...article, ...request.postDataJSON(), updated_at: '2026-01-03T00:00:00Z' }));
        return respond([{ id: articleID }]);
      }
      if (request.method() === 'DELETE') { articles = []; return respond(null); }
    }
    if (path === '/rest/v1/user_todos') {
      if (request.method() === 'GET') return respond(todos);
      if (request.method() === 'POST') {
        todos.push({ ...request.postDataJSON(), id: 'added-todo', completed: false });
        return respond(null, 201);
      }
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      if (request.method() === 'PATCH') { todos = todos.map(todo => todo.id === id ? { ...todo, ...request.postDataJSON() } : todo); return respond(null); }
      if (request.method() === 'DELETE') { todos = todos.filter(todo => todo.id !== id); return respond(null); }
    }
    if (/^\/rest\/v1\/bookmarks$/.test(path)) {
      if (request.method() !== 'GET') return respond(null, 201);
      if (url.searchParams.has('article_path')) return respond(null);
      return respond([{ article_path: 'javascript:alert(1)', title: 'Unsafe personal link' }, { article_path: `/members/read/?id=${articleID}`, title: privateTitle }]);
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return respond({ message: 'Unexpected mock request' }, 500);
  });
  return { requests, unexpected };
}

test.describe('账号页面：模拟 Supabase HTTP 集成（无需云凭据）', () => {
  test.skip(!mockMode, `Start a fresh server with PUBLIC_SUPABASE_URL=${mockURL} and PUBLIC_SUPABASE_ANON_KEY=public-test-key.`);

  test('个人中心不再展示最近阅读，设置和待办按需展开且移动端不溢出', async ({ page }) => {
    await mockSupabase(page, { signedIn: true });
    await page.goto('/account/');
    await expect(page.locator('#account-email')).toHaveText('reader@example.invalid');
    await expect(page.locator('#user-todos li').first()).toBeAttached();
    await expect(page.getByRole('heading', { name: '最近阅读' })).toHaveCount(0);
    await expect(page.locator('#reading-history')).toHaveCount(0);
    await expect(page.locator('#password-form')).not.toBeVisible();
    await expect(page.locator('#todo-form')).not.toBeVisible();
    await expect(page.locator('#account-status')).toBeEmpty();
    await page.getByText('账号设置', { exact: true }).click();
    await expect(page.locator('#password-form')).toBeVisible();
    await expect(page.locator('#passkey-heading')).toBeVisible();
    await expect(page.locator('#register-passkey')).toBeVisible();
    await page.getByText('我的待办', { exact: true }).click();
    await expect(page.locator('#todo-form')).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/account-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: 'test-results/account-desktop.png', fullPage: true });
  });

  test('密码恢复入口自动展开账号设置并聚焦新密码', async ({ page }) => {
    await mockSupabase(page, { signedIn: true });
    await page.goto('/account/?reset=1');
    await expect(page.locator('#password-form')).toBeVisible();
    await expect(page.getByRole('heading', { name: '重置密码' })).toBeVisible();
    await expect(page.getByLabel('新密码', { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\/account\/$/);
  });

  test('邮箱密码登录默认可用，错误后可重试且刷新保持登录', async ({ page }) => {
    const mock = await mockSupabase(page);
    await page.goto('/account/');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#passkey-login')).toBeVisible();
    await page.getByLabel('邮箱', { exact: true }).fill('reader@example.invalid');
    await page.getByLabel('密码', { exact: true }).fill('Wrong-password-123!');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.locator('#account-status')).toContainText('邮箱或密码错误');
    await page.getByLabel('密码', { exact: true }).fill('Test-password-123!');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.locator('#account-private')).toBeVisible();
    await page.reload();
    await expect(page.locator('#account-email')).toHaveText('reader@example.invalid');
    expect(mock.requests.some(r => /\/otp|\/signup/.test(r.url()))).toBe(false);
  });

  test('忘记密码邮件返回本站，已登录用户可设置密码且校验二次输入', async ({ page }) => {
    const mock = await mockSupabase(page);
    await page.goto('/account/');
    await expect(page.locator('#login-form')).toBeVisible();
    await page.getByLabel('邮箱', { exact: true }).fill('reader@example.invalid');
    await page.getByRole('button', { name: '忘记密码', exact: true }).click();
    await expect(page.locator('#account-status')).toContainText('重置密码邮件');
    const recovery = mock.requests.find(r => new URL(r.url()).pathname === '/auth/v1/recover');
    expect(new URL(recovery!.url()).searchParams.get('redirect_to')).toMatch(/\/account\/\?reset=1$/);
    await page.getByLabel('密码', { exact: true }).fill('Test-password-123!');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByText('账号设置', { exact: true }).click();
    await expect(page.locator('#password-form')).toBeVisible();
    await page.getByLabel('新密码', { exact: true }).fill('New-password-123!');
    await page.getByLabel('确认新密码', { exact: true }).fill('Different-password');
    await page.getByRole('button', { name: '保存密码', exact: true }).click();
    await expect(page.locator('#password-status')).toContainText('两次输入');
    await page.getByLabel('确认新密码', { exact: true }).fill('New-password-123!');
    await page.getByRole('button', { name: '保存密码', exact: true }).click();
    await expect(page.locator('#password-status')).toContainText('密码已更新');
    const update = mock.requests.find(r => new URL(r.url()).pathname === '/auth/v1/user' && r.method() === 'PUT');
    expect(update?.postDataJSON()).toMatchObject({ password: 'New-password-123!' });
    await expect(page.getByLabel('新密码', { exact: true })).toBeEmpty();
  });

  test('匿名用户仅可申请邀请邮箱登录，不创建账号且无法访问私有或管理页面', async ({ page }) => {
    const mock = await mockSupabase(page);
    await page.goto('/account/');
    await expect(page.locator('#account-status')).toHaveText('');
    await expect(page.locator('#login-form')).toBeVisible();
    await expectNoPrivateUI(page);
    await page.getByLabel('邮箱', { exact: true }).fill('invitee@example.invalid');
    await page.getByRole('button', { name: '发送登录邮件' }).click();
    await expect(page.locator('#account-status')).toContainText('登录邮件已发送');
    const otp = mock.requests.find(request => new URL(request.url()).pathname === '/auth/v1/otp');
    expect(otp?.postDataJSON()).toMatchObject({ email: 'invitee@example.invalid', create_user: false });
    for (const path of [`/members/read/?id=${articleID}`, '/account/admin/']) {
      await page.goto(path);
      await expect(page.locator('#account-status')).toContainText('请先到个人中心登录。');
      await expectNoPrivateUI(page);
    }
    expect(mock.requests.filter(request => request.url().includes('/rest/v1/')).every(request => request.method() === 'GET' && new URL(request.url()).pathname === '/rest/v1/articles')).toBe(true);
    expect(mock.unexpected).toEqual([]);
  });

  test('已登录非管理员被拒绝，非法 ID 在查询正文之前被拦截', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#account-status')).toHaveText('当前账号没有管理权限。');
    await expectNoPrivateUI(page);
    for (const query of ['', '?id=invalid', '?id=' + encodeURIComponent('<img src=x onerror=alert(1)>')]) {
      await page.goto(`/members/read/${query}`);
      await expect(page.locator('#account-status')).toHaveText('文章地址无效。');
      await expectNoPrivateUI(page);
    }
    expect(mock.requests.some(request => new URL(request.url()).pathname === '/rest/v1/articles')).toBe(false);
    expect(mock.unexpected).toEqual([]);
  });

  test('移除收藏与阅读记录入口，普通文章、云端阅读不写个人数据', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true });
    await page.goto('/');
    await page.locator('#home-posts a[href^="/posts/"]').filter({ hasNotText: privateTitle }).first().click();
    await expect(page.locator('#article-account-actions')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /收藏/ })).toHaveCount(0);
    await page.goto(`/posts/read/?id=${articleID}`);
    await expect(page.locator('#private-save-status')).toHaveCount(0);
    await page.goto('/account/');
    await expect(page.locator('#reading-history')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '最近阅读' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '我的收藏' })).toHaveCount(0);
    expect(mock.requests.some(r => /reading_history|bookmarks/.test(r.url()))).toBe(false);
    expect(mock.unexpected).toEqual([]);
  });

  test('授权列表与受限 Markdown 消毒通过模拟 HTTP', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true });
    const externalImages: string[] = [];
    await page.route('https://private-image.invalid/**', async route => { externalImages.push(route.request().url()); await route.abort(); });
    await page.goto(`/members/read/?id=${articleID}`);
    await expect(page.locator('#private-title')).toHaveText(privateTitle);
    await expect(page.locator('#private-body')).toContainText(privateText);
    await expect(page.locator('#private-body h2')).toHaveText('Test section');
    await expect(page.locator('#private-body img, #private-body script, #private-body iframe, #private-body [onerror]')).toHaveCount(0);
    await expect(page.locator('#private-body a[href^="javascript:"]')).toHaveCount(0);
    await expect(page.locator('#private-body a[href="https://example.invalid/reference"]')).toHaveAttribute('rel', 'noreferrer noopener');
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__privateXss)).toBeUndefined();
    expect(externalImages).toEqual([]);
    await expect(page.locator('#private-save-status')).toHaveCount(0);
    expect(mock.unexpected).toEqual([]);
  });

  test('个人待办新增、切换完成、删除均限定当前账号', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true });
    await page.goto('/account/');
    await expect(page.locator('#user-todos li').first()).toBeAttached();
    await page.getByText('我的待办', { exact: true }).click();
    await page.getByLabel('新待办', { exact: true }).fill('Added synthetic task');
    await page.getByRole('button', { name: '添加待办', exact: true }).click();
    const item = page.locator('#user-todos li').filter({ hasText: 'Added synthetic task' });
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: '标记完成', exact: true }).click();
    await expect(item).toContainText('已完成：Added synthetic task');
    await item.getByRole('button', { name: '标记未完成', exact: true }).click();
    await expect(item).not.toContainText('已完成：');
    await item.getByRole('button', { name: '删除', exact: true }).click();
    await expect(item).toHaveCount(0);
    await expect(page.locator('#user-todos')).toContainText('Synthetic personal task');
    const writes = mock.requests.filter(request => new URL(request.url()).pathname === '/rest/v1/user_todos' && request.method() !== 'GET' && request.method() !== 'OPTIONS');
    expect(writes.map(request => request.method())).toEqual(['POST', 'PATCH', 'PATCH', 'DELETE']);
    expect(writes[0].postDataJSON()).toMatchObject({ user_id: userID, title: 'Added synthetic task' });
    for (const request of writes.slice(1)) {
      const url = new URL(request.url());
      expect(url.searchParams.get('user_id')).toBe(`eq.${userID}`);
      expect(url.searchParams.get('id')).toBe('eq.added-todo');
    }
    expect(mock.unexpected).toEqual([]);
  });

  test('预览依赖加载失败不阻断登录、文章加载和保存', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.route(/\/node_modules\/\.vite\/deps\/(marked|dompurify)\.js/, route =>
      route.fulfill({ status: 504, contentType: 'text/plain', body: 'Outdated Optimize Dep' }));
    await page.goto('/account/admin/');
    await expect(page.locator('#account-status')).toHaveText('已验证站长权限。');
    await expect(page.locator('#admin-panel')).toBeVisible();
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.getByRole('button', { name: '分栏', exact: true }).click();
    await expect(page.locator('#preview-content')).toContainText('预览组件加载失败');
    await page.locator('[name="title"]').fill('Saved without preview');
    await page.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(page.locator('[name="title"]')).toHaveValue('Saved without preview');
    await expect(page.locator('#account-status')).toHaveText('操作成功。');
  });

  test('管理列表与编辑独立，草稿保存、发布、取消发布和返回保护', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true, admin: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#admin-articles')).toBeVisible();
    await expect(page.locator('#article-editor')).toBeHidden();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await expect(page.locator('#article-editor')).toBeVisible();
    await expect(page.locator('#article-library')).toBeHidden();
    await page.getByRole('textbox', { name: '标题', exact: true }).fill('New draft');
    await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('Draft body');
    await page.getByRole('button', { name: '返回文章列表' }).click();
    await expect(page.locator('#app-confirm')).toBeVisible();
    await page.locator('#app-confirm-cancel').click();
    await expect(page.locator('#article-editor')).toBeVisible();
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    await page.getByRole('button', { name: '发布文章', exact: true }).click();
    await expect(page.getByRole('button', { name: '保存修改', exact: true })).toBeVisible();
    await page.locator('#article-more').evaluate(element => element.scrollIntoView({ block: 'center' }));
    await page.getByText('更多操作', { exact: true }).click();
    await page.getByRole('button', { name: '取消发布', exact: true }).click();
    await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '返回文章列表' }).click();
    await expect(page.locator('#article-library')).toBeVisible();
    await expect(page.locator('#admin-articles')).toContainText('New draft');
    const writes = mock.requests.filter(r => /\/rest\/v1\/articles/.test(r.url()) && ['POST','PATCH'].includes(r.method()));
    expect(writes.map(r => r.postDataJSON().status)).toEqual(['draft', 'published', 'draft']);
  });

  test('公开发布需确认，普通文章不显示授权，删除与授权解耦', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true, admin: true, visibility: 'authenticated' });
    await page.goto('/account/admin/');
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await page.getByRole('textbox', { name: '标题', exact: true }).fill('Public article');
    await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('Public body');
    await page.getByLabel('可见范围').selectOption('public');
    await page.getByRole('button', { name: '发布文章', exact: true }).click();
    await expect(page.locator('#app-confirm')).toBeVisible();
    await page.locator('#app-confirm-cancel').click();
    expect(mock.requests.filter(r => r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/articles')).toHaveLength(0);
    await page.getByRole('button', { name: '发布文章', exact: true }).click();
    await page.locator('#app-confirm-ok').click();
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    await expect(page.locator('#grant-panel')).toBeHidden();
    await page.locator('#article-more summary').click();
    await page.getByRole('button', { name: '删除文章', exact: true }).click();
    await page.locator('#app-confirm-ok').click();
    await expect(page.locator('#article-library')).toBeVisible();
    await expect(page.locator('#admin-articles li')).toHaveCount(0);
  });

  test('站长加载、新建、编辑、保存、授权及撤销授权', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true, admin: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#account-status')).toHaveText('已验证站长权限。');
    await expect(page.locator('#admin-panel')).toBeVisible();
    await expect(page.locator('#admin-articles')).toContainText(privateTitle);
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await expect(page.locator('#article-editor [name="title"]')).toHaveValue(privateTitle);
    await expect(page.locator('#article-editor [name="body"]')).toHaveValue(new RegExp(privateText));
    await page.locator('#article-editor [name="title"]').fill('Edited synthetic article');
    await page.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(page.locator('#account-status')).toHaveText('操作成功。');
    await expect(page.locator('[name="title"]')).toHaveValue('Edited synthetic article');
    const update = mock.requests.find(request => new URL(request.url()).pathname === '/rest/v1/articles' && request.method() === 'PATCH');
    expect(update?.postDataJSON()).toMatchObject({ title: 'Edited synthetic article' });
    expect(new URL(update!.url()).searchParams.get('id')).toBe(`eq.${articleID}`);
    expect(new URL(update!.url()).searchParams.get('updated_at')).toBe('eq.2026-01-01T00:00:00Z');
    await page.locator('#grant-panel summary').click();
    await expect(page.locator('#article-grants')).toBeEmpty();
    await page.getByLabel('授权邮箱', { exact: true }).fill('invitee@example.invalid');
    await page.getByRole('button', { name: '授权此账号', exact: true }).click();
    await expect(page.locator('#article-grants')).toContainText(userID);
    const grant = mock.requests.find(request => new URL(request.url()).pathname === '/rest/v1/rpc/admin_grant_article');
    expect(grant?.postDataJSON()).toEqual({ article: articleID, email: 'invitee@example.invalid' });
    await page.getByRole('button', { name: '撤销授权', exact: true }).click();
    await expect(page.locator('#article-grants')).toBeEmpty();
    const revoke = mock.requests.find(request => new URL(request.url()).pathname === '/rest/v1/article_grants' && request.method() === 'DELETE');
    expect(new URL(revoke!.url()).searchParams.get('article_id')).toBe(`eq.${articleID}`);
    expect(new URL(revoke!.url()).searchParams.get('user_id')).toBe(`eq.${userID}`);
    await page.getByRole('button', { name: '返回文章列表' }).click();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await expect(page.locator('#grant-panel')).not.toBeVisible();
    await page.locator('#article-editor [name="title"]').fill('New synthetic draft');
    await page.locator('#article-editor [name="body"]').fill('Synthetic draft body');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    const insert = mock.requests.find(request => new URL(request.url()).pathname === '/rest/v1/articles' && request.method() === 'POST');
    expect(insert?.postDataJSON()).toMatchObject({ title: 'New synthetic draft', body: 'Synthetic draft body', visibility: 'authenticated', status: 'draft' });
    expect(mock.unexpected).toEqual([]);
  });

  test('登录文章在首页混排并以真实标题阅读，默认登录可见', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true, visibility: 'authenticated' });
    await page.goto('/');
    await expect(page.locator('#home-posts > li').first()).toContainText(privateTitle);
    await page.getByRole('link', { name: privateTitle, exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/read\/\?id=/);
    await expect(page.locator('article h1')).toHaveText(privateTitle);
    await expect(page.locator('#private-body')).toContainText(privateText);
    await expect(page.locator('main')).not.toContainText('受限文章');
    await expect(page.locator('#cloud-toc a')).toHaveText('Test section');
    await expect(page).toHaveTitle(`${privateTitle} | 书山有路`);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: 'test-results/cloud-reader.png', fullPage: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#admin-panel')).toBeVisible();
    await expect(page.locator('[name="visibility"]')).toHaveValue('authenticated');
    await expect(page.locator('[name="visibility"] option')).toHaveText(['登录可见', '公开']);
  });

  test('首页不拉取正文，管理员也不会在首页看到草稿', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true, admin: true, draft: true });
    await page.goto('/');
    await expect.poll(() => mock.requests.filter(r => new URL(r.url()).pathname === '/rest/v1/articles').length).toBeGreaterThan(0);
    await expect(page.locator('#home-posts [data-cloud]')).toHaveCount(0);
    for (const request of mock.requests.filter(r => new URL(r.url()).pathname === '/rest/v1/articles')) {
      expect(new URL(request.url()).searchParams.get('select')).toBe('id,title,visibility,created_at');
      expect(new URL(request.url()).searchParams.get('status')).toBe('eq.published');
    }
  });

  test('匿名首页不展示登录文章任何字段，直链也不泄露', async ({ page }) => {
    await mockSupabase(page, { visibility: 'authenticated' });
    await page.goto('/');
    await expect(page.locator('#cloud-feed-status')).toHaveText('');
    await expect(page.locator('#home-posts')).not.toContainText(privateTitle);
    await page.goto(`/posts/read/?id=${articleID}`);
    await expect(page.locator('#account-status')).toContainText('登录');
    await expect(page.locator('#private-title')).toBeEmpty();
    await expect(page.locator('#private-body')).toBeEmpty();
  });

  test('另一标签页退出后首页立即移除登录文章', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, visibility: 'authenticated' });
    await page.goto('/');
    await expect(page.locator('#home-posts')).toContainText(privateTitle);
    const otherTab = await page.context().newPage();
    await mockSupabase(otherTab, { signedIn: true, visibility: 'authenticated' });
    await otherTab.goto('/account/');
    await expect(otherTab.locator('#account-email')).toHaveText('reader@example.invalid');
    await otherTab.getByRole('button', { name: '退出登录' }).click();
    await expect(page.locator('#home-posts [data-cloud]')).toHaveCount(0);
    await otherTab.close();
  });

  test('另一标签页退出后阅读页清除标题、正文和目录', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, visibility: 'authenticated' });
    await page.goto(`/posts/read/?id=${articleID}`);
    await expect(page.locator('#private-body')).toContainText(privateText);
    const otherTab = await page.context().newPage();
    await mockSupabase(otherTab, { signedIn: true, visibility: 'authenticated' });
    await otherTab.goto('/account/');
    await expect(otherTab.locator('#account-email')).toHaveText('reader@example.invalid');
    await otherTab.getByRole('button', { name: '退出登录' }).click();
    await expect(page.locator('#private-title')).toBeEmpty();
    await expect(page.locator('#private-body')).toBeEmpty();
    await expect(page.locator('#cloud-toc a')).toHaveCount(0);
    await expect(page.locator('#private-article')).toBeHidden();
    await otherTab.close();
  });

  test('公开文章可从首页匿名阅读，不写个人记录', async ({ page }) => {
    const mock = await mockSupabase(page, { visibility: 'public' });
    await page.goto('/');
    await page.getByRole('link', { name: privateTitle, exact: true }).click();
    await expect(page.locator('article h1')).toHaveText(privateTitle);
    await expect(page.locator('#private-body')).toContainText(privateText);
    expect(mock.requests.some(r => /reading_history|bookmarks/.test(r.url()))).toBe(false);
  });

  test('旧授权文章列表跳转首页且不再保留重复菜单入口', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/members/');
    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('header a[href="/members/"]')).toHaveCount(0);
    await expect(page.locator('#member-articles')).toHaveCount(0);
  });

  test('账号入口合并到全站导航，管理页头精简且移动菜单可用', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#admin-panel')).toBeVisible();
    await expect(page.locator('main nav')).toHaveCount(0);
    await expect(page.locator('.account-heading h1')).toHaveText('文章管理');
    await expect(page.locator('.account-heading #new-article')).toBeVisible();
    await expect(page.locator('#account-status')).not.toBeVisible();
    await page.locator('button[aria-controls="account-menu"]').click();
    await expect(page.locator('#account-menu a[aria-current="page"]')).toHaveText('文章管理');
    await expect(page.locator('#account-menu a[href="/members/"]')).toHaveCount(0);
    await page.locator('#account-menu a[href="/account/"]').click();
    await expect(page).toHaveURL(/\/account\/$/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '菜单', exact: true }).click();
    for (const path of ['/account/', '/account/admin/']) {
      await expect(page.locator(`#mobile-menu a[href="${path}"]`)).toBeVisible();
    }
    await page.locator('#mobile-menu a[href="/account/admin/"]').click();
    await expect(page.locator('.account-heading #new-article')).toBeVisible();
  });

  test('管理页沿用博客内容对齐与蓝色操作，并适配明暗主题', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const home = await page.locator('main').boundingBox();
    await page.goto('/account/admin/');
    await expect(page.locator('#admin-panel')).toBeVisible();
    const admin = await page.locator('main').boundingBox();
    expect(admin!.x).toBe(home!.x);
    expect(admin!.width).toBe(home!.width);
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const appearance = await page.locator('#new-article').evaluate(button => ({
        background: getComputedStyle(button).backgroundColor,
        fontSize: parseFloat(getComputedStyle(button).fontSize),
        shadow: getComputedStyle(button).boxShadow,
      }));
      expect(appearance.background).toBe(dark ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)');
      expect(appearance.fontSize).toBeGreaterThanOrEqual(14);
      expect(appearance.shadow).toBe('none');
      await page.screenshot({ path: `test-results/admin-unified-${dark ? 'dark' : 'light'}.png`, fullPage: true });
    }
  });

  test('写作工作台支持筛选、安全实时预览、格式工具和移动端布局', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.goto('/account/admin/');
    await expect(page.locator('#admin-panel')).toBeVisible();
    await expect(page.locator('#count-all')).toHaveText('1');
    await page.getByRole('button', { name: '草稿', exact: true }).click();
    await expect(page.locator('#list-empty')).toBeVisible();
    await page.getByRole('button', { name: '全部', exact: true }).click();
    await page.getByRole('searchbox', { name: '搜索文章' }).fill('no-such-title');
    await expect(page.locator('#admin-articles li')).toHaveCount(0);
    await page.getByRole('searchbox', { name: '搜索文章' }).fill('');
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.getByRole('button', { name: '分栏', exact: true }).click();
    await expect(page.locator('#preview-content')).toContainText(privateText);
    await expect(page.locator('#preview-content script, #preview-content img')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Markdown 正文', exact: true }).fill('## Live preview\n\n**Updated text**');
    await expect(page.locator('#preview-content h2')).toHaveText('Live preview');
    await expect(page.locator('#save-state')).toHaveText('有未保存的修改');
    await page.getByRole('button', { name: '加粗', exact: true }).click();
    await expect(page.locator('[name="body"]')).toHaveValue(/加粗文字/);
    await page.getByRole('button', { name: '预览', exact: true }).click();
    await expect(page.locator('[name="body"]')).not.toBeVisible();
    await page.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    for (const width of [320, 390, 768, 900, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: 'test-results/admin-studio-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: '分栏', exact: true }).click();
    await page.screenshot({ path: 'test-results/admin-studio-desktop.png', fullPage: true });
    // Verify light/dark and mobile layout using the actual rendered element geometry.
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: 'test-results/admin-studio-dark.png', fullPage: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.locator('[name="body"]').fill('Unsaved local UI test');
    await page.getByRole('button', { name: '返回文章列表' }).click();
    await expect(page.locator('#app-confirm')).toBeVisible();
    await page.locator('#app-confirm-cancel').click();
    await expect(page.locator('[name="body"]')).toHaveValue('Unsaved local UI test');
    await page.getByRole('button', { name: '返回文章列表' }).click();
    await page.locator('#app-confirm-ok').click();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await expect(page.locator('[name="body"]')).toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('桌面写作操作栏贴近视口底部，正文占满剩余空间', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true, visibility: 'authenticated', draft: true });
    await page.goto('/account/admin/');
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    for (const height of [900, 720, 600]) {
      await page.setViewportSize({ width: 1440, height });
      for (const view of ['编辑', '分栏', '预览']) {
        await page.locator('.view-tools').getByRole('button', { name: view, exact: true }).click();
        await expect.poll(async () => {
          const box = await page.locator('.editor-actions').boundingBox();
          return Math.abs(height - box!.y - box!.height - 16);
        }).toBeLessThanOrEqual(3);
        await expect(page.locator('#save-article')).toBeInViewport();
        await expect(page.locator('#publish-article')).toBeInViewport();
      }
    }
  });

  test('更多操作向上展开不挤压底栏，全屏独立于编辑视图', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true, visibility: 'authenticated', draft: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/account/admin/');
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await expect(page.locator('.view-tools button')).toHaveCount(3);
    await expect(page.locator('.view-tools #fullscreen-editor')).toHaveCount(0);
    await expect(page.locator('#fullscreen-editor')).toBeVisible();
    await expect.poll(async () => { const box = await page.locator('.editor-actions').boundingBox(); return Math.abs(900 - box!.y - box!.height - 16); }).toBeLessThanOrEqual(3);
    const before = await page.locator('#save-article').boundingBox();
    await page.locator('#article-more summary').click();
    await expect(page.locator('#article-more-panel')).toBeVisible();
    const after = await page.locator('#save-article').boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    const menu = await page.locator('#article-more-panel').boundingBox();
    expect(menu!.y + menu!.height).toBeLessThan(before!.y);
    await page.keyboard.press('Escape');
    await expect(page.locator('#article-more')).not.toHaveAttribute('open');
    await expect(page.locator('#article-more summary')).toBeFocused();
    await page.locator('[name="body"]').fill('Unsaved styling');
    await expect(page.locator('#save-state')).toHaveAttribute('data-state', 'unsaved');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page.locator('#save-state')).toHaveAttribute('data-state', 'saved');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });

  test('保存保持分栏、选区和正文，窄屏自动降级编辑', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/account/admin/');
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.getByRole('button', { name: '分栏', exact: true }).click();
    const body = page.getByRole('textbox', { name: 'Markdown 正文', exact: true });
    await body.fill('## Keep view\n\nSaved content');
    await body.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(3, 7));
    await body.press('Control+s');
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    await expect(page.locator('.editor-canvas')).toHaveAttribute('data-view', 'split');
    await expect(body).toBeFocused();
    expect(await body.evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd])).toEqual([3, 7]);
    await body.fill('Second save');
    await body.press('Control+s');
    await expect(page.locator('#save-state')).toHaveText('已保存至云端');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.editor-canvas')).toHaveAttribute('data-view', 'write');
    await expect(body).toBeVisible();
  });

  test('预览空正文校验可定位，刷新后可恢复本机草稿', async ({ page }) => {
    await mockSupabase(page, { signedIn: true, admin: true });
    await page.goto('/account/admin/');
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await page.getByRole('textbox', { name: '标题', exact: true }).fill('Recover title');
    await page.getByRole('button', { name: '预览', exact: true }).click();
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    const body = page.getByRole('textbox', { name: 'Markdown 正文', exact: true });
    await expect(body).toBeFocused();
    await expect(page.locator('#save-feedback')).toContainText('请填写正文');
    await body.fill('Local recovery content');
    page.once('dialog', dialog => dialog.accept());
    await page.reload();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    await expect(page.locator('#draft-recovery')).toBeVisible();
    await page.getByRole('button', { name: '恢复草稿', exact: true }).click();
    await expect(body).toHaveValue('Local recovery content');
    await expect(page.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('Recover title');
    await expect(page.locator('#save-state')).toHaveText('有未保存的修改');
  });

  test('无授权文章不显示正文，个人中心退出后清空记录', async ({ page }) => {
    const mock = await mockSupabase(page, { signedIn: true, denied: true });
    await page.goto(`/members/read/?id=${articleID}`);
    await expect(page.locator('#account-status')).toHaveText('文章不存在或当前账号无权访问。');
    await expectNoPrivateUI(page);
    await page.goto('/account/');
    await expect(page.locator('#account-email')).toHaveText('reader@example.invalid');
    await expect(page.locator('#user-todos')).toContainText('Synthetic personal task');
    await expect(page.locator('#bookmarks')).toHaveCount(0);
    await page.getByRole('button', { name: '退出登录' }).click();
    await expect(page.locator('#account-status')).toHaveText('');
    await expectNoPrivateUI(page);
    expect(mock.unexpected).toEqual([]);
  });
});
