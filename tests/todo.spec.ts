import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function add(page: Page, title: string, quadrant = 2, due = '') {
  await page.locator('#addTaskBtn').click();
  await page.locator('#taskTitle').fill(title);
  await page.locator(`#addModal .quadrant-btn[data-quadrant="${quadrant}"]`).click();
  if (due) await page.locator('#taskDue').fill(due);
  await page.locator('#btnSubmit').click();
  await expect(page.locator('#addModal')).not.toBeVisible();
}

test.describe('Todo Page - 专注清单', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo/');
    await page.evaluate(() => localStorage.removeItem('todo_quadrant_data'));
    await page.reload();
    // 复用本地开发服务时隐藏 Astro 调试浮层，避免遮挡底部操作。
    await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; }' });
  });

  test('清单加载、空状态、真实站点导航', async ({ page }) => {
    await expect(page.locator('.todo-header h1')).toHaveText('待办清单');
    await expect(page.locator('.todo-filter')).toHaveCount(5);
    await expect(page.locator('#taskEmpty')).toBeVisible();
    await expect(page.locator('body > header nav')).toBeVisible();
    await expect(page.locator('#stat-total')).toHaveText('0');
  });

  test('新增、象限筛选、搜索与数据持久化', async ({ page }) => {
    await add(page, '项目报告', 1);
    await add(page, '学习计划', 2);
    await expect(page.locator('.focus-list .task-item')).toHaveCount(2);
    await page.locator('[data-filter="1"]').click();
    await expect(page.locator('.focus-list .task-title')).toHaveText('项目报告');
    await page.locator('#searchInput').fill('学习');
    await expect(page.locator('.focus-list .task-item')).toHaveCount(0);
    await page.locator('[data-filter="0"]').click();
    await expect(page.locator('.focus-list .task-title')).toHaveText('学习计划');
    await page.locator('#searchClearBtn').click();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(2);
    await expect(page.locator('#stat-pending')).toHaveText('2');
  });

  test('现有数据不迁移不丢失，并按日期分组', async ({ page }) => {
    await page.evaluate(() => {
      const now = new Date();
      const date = (delta: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta, 12).getTime();
      const items = [-1, 0, 2].map((delta, index) => ({ id: String(index), title: ['逾期任务', '今日任务', '未来任务'][index], quadrant: index + 1, createdAt: Date.now(), updatedAt: Date.now(), dueDate: date(delta), completed: false, priority: 'medium' }));
      localStorage.setItem('todo_quadrant_data', JSON.stringify({ version: 1, lastUpdated: Date.now(), items }));
    });
    await page.reload();
    await expect(page.locator('#list-overdue .task-title')).toHaveText('逾期任务');
    await expect(page.locator('#list-today .task-title')).toHaveText('今日任务');
    await expect(page.locator('#list-upcoming .task-title')).toHaveText('未来任务');
    await expect(page.locator('#stat-today')).toHaveText('1');
  });

  test('编辑、完成、归档恢复、删除和撤销', async ({ page }) => {
    await add(page, '原任务');
    await page.locator('.focus-list .edit').click();
    await page.locator('#editTaskTitle').fill('修改后的任务');
    await page.locator('#editBtnSubmit').click();
    await expect(page.locator('#editModal')).not.toBeVisible();
    await expect(page.locator('.focus-list .task-title')).toHaveText('修改后的任务');
    await page.locator('.focus-list .task-checkbox').click();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(0);
    await expect(page.locator('#stat-rate')).toHaveText('100%');
    await page.locator('#archiveToggle').click();
    await page.locator('.archive-action-btn.restore').click();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(1);
    await page.locator('.focus-list .delete').click();
    await page.locator('#deleteBtnConfirm').click();
    await expect(page.locator('#deleteModal')).not.toBeVisible();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(0);
    await page.locator('#undoBtn').click();
    await expect(page.locator('.focus-list .task-item')).toHaveCount(1);
  });

  test('拖动任务到象限筛选', async ({ page }) => {
    await add(page, '拖拽任务', 1);
    await page.locator('.focus-list .task-item').dragTo(page.locator('[data-filter="2"]'));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('todo_quadrant_data')!).items[0].quadrant)).toBe(2);
    await expect(page.locator('.task-quadrant')).toHaveText('重要不紧急');
  });

  test('批量完成和 JSON/CSV 导出', async ({ page }) => {
    await add(page, '批量任务 A');
    await add(page, '批量任务 B');
    await page.locator('.todo-more summary').click();
    await page.locator('#batchModeBtn').click();
    for (const checkbox of await page.locator('.focus-list .task-batch-checkbox').all()) await checkbox.click();
    await page.locator('#btnBatchComplete').click();
    await expect(page.locator('#stat-completed')).toHaveText('2');
    await page.locator('#btnBatchCancel').click();
    for (const id of ['exportJsonBtn', 'exportCsvBtn']) {
      await page.locator('.todo-more summary').click();
      const download = page.waitForEvent('download');
      await page.locator('#' + id).click();
      expect((await download).suggestedFilename()).toMatch(/todo_backup_/);
    }
  });

  test('日历新建、详情和改期后清单同步', async ({ page }) => {
    const date = await page.locator('.cal-cell-today').getAttribute('data-date');
    await page.locator('.cal-cell-today').click();
    await page.locator('#calendarDayAdd').click();
    await page.locator('#taskTitle').fill('日历任务');
    await page.locator('#btnSubmit').click();
    await expect(page.locator('#addModal')).not.toBeVisible();
    await expect(page.locator('#list-today .task-title')).toHaveText('日历任务');
    await page.locator('.cal-cell-today .cal-chip').click();
    await expect(page.locator('#detailTitle')).toHaveText('日历任务');
    await page.locator('#detailBtnCancel').click();
    await expect(page.locator('#detailModal')).not.toBeVisible();
    const target = page.locator(`.cal-cell[data-date]:not([data-date="${date}"])`).last();
    await page.locator('.cal-cell-today .cal-chip').dragTo(target);
    await expect(page.locator('#list-today .task-item')).toHaveCount(0);
    await expect(page.locator('.focus-list .task-item')).toHaveCount(1);
  });

  test('三种主题与移动端无横向溢出，长标题可读', async ({ page }) => {
    await add(page, '很长的任务标题'.repeat(20));
    for (const theme of ['light', 'dark', 'purple']) {
      await page.evaluate(t => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        document.documentElement.dataset.theme = t === 'purple' ? 'purple' : '';
      }, theme);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator('.focus-list .task-title')).toBeVisible();
        await expect(page.locator('.focus-list .edit')).toBeVisible();
      }
    }
  });
});

// ============ 账号云端同步（模拟 Supabase，无需真实凭据） ============
// 与 tests/account.spec.ts 相同的环境约定：
// PUBLIC_SUPABASE_URL=https://account-test.supabase.co PUBLIC_SUPABASE_ANON_KEY=public-test-key pnpm test tests/todo.spec.ts
const mockURL = 'https://account-test.supabase.co';
const todoMockMode = process.env.PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === mockURL && Boolean(process.env.PUBLIC_SUPABASE_ANON_KEY);
const todoUserID = '33333333-3333-4333-8333-333333333333';

interface TodoFlow {
  rows: Array<Record<string, unknown>>;
  posts: Array<Record<string, unknown>>;
  patches: Array<Record<string, unknown>>;
  deletes: number;
}

async function mockTodoSupabase(page: Page, seedRows: Array<Record<string, unknown>> = [], signedIn = true) {
  const flow: TodoFlow = { rows: [...seedRows], posts: [], patches: [], deletes: 0 };
  const rowID = (prefix: number) => `22224444-44${String(prefix).padStart(4, '0')}-4444-8444-44${String(prefix).padStart(8, '0')}`;
  if (signedIn) {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: todoUserID, exp: expires, role: 'authenticated' })}.synthetic-signature`;
    const user = { id: todoUserID, aud: 'authenticated', role: 'authenticated', email: 'reader@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    await page.addInitScript(({ token, user }: { token: string; user: Record<string, unknown> }) => {
      localStorage.setItem('sb-account-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
    }, { token, user });
  }
  await page.route(`${mockURL}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    const respond = (body: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/auth/v1/user') return respond(signedIn ? { id: todoUserID, aud: 'authenticated', role: 'authenticated', email: 'reader@example.invalid' } : { message: 'no session' }, signedIn ? 200 : 401);
    if (path === '/auth/v1/logout') return respond({});
    if (path === '/rest/v1/user_todos') {
      if (request.method() === 'GET') return respond(flow.rows);
      if (request.method() === 'POST') {
        const payload = request.postDataJSON();
        const list = Array.isArray(payload) ? payload : [payload];
        list.forEach((row, index) => flow.rows.push({ completed: false, quadrant: 1, priority: 'medium', ...row, id: row.id ?? rowID(flow.rows.length + index + 1), updated_at: new Date().toISOString() }));
        flow.posts.push(payload);
        return respond(null, 201);
      }
      if (request.method() === 'PATCH') {
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const patch = request.postDataJSON();
        flow.patches.push(patch);
        flow.rows = flow.rows.map(row => row.id === id ? { ...row, ...patch } : row);
        return respond(null);
      }
      if (request.method() === 'DELETE') { flow.deletes += 1; const ids = (url.searchParams.get('id') || url.searchParams.get('in') || '').replace(/^eq\./, '').replace(/^\(|\)$/g, '').split(','); flow.rows = flow.rows.filter(row => !ids.includes(String(row.id))); return respond(null); }
    }
    return respond({});
  });
  return flow;
}

test.describe('待办页面：账号云端同步（模拟 Supabase HTTP）', () => {
  test.skip(!todoMockMode, `Start with PUBLIC_SUPABASE_URL=${mockURL} PUBLIC_SUPABASE_ANON_KEY=public-test-key.`);

  test('登录后以云端数据渲染并写入本地镜像', async ({ page }) => {
    const flow = await mockTodoSupabase(page, [{ id: '22224444-4401-4444-8444-440000000001', user_id: todoUserID, title: '云端任务', description: null, quadrant: 2, priority: 'high', due_date: null, completed: false, completed_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]);
    await page.goto('/todo/');
    await expect(page.locator('.focus-list .task-title')).toHaveText('云端任务');
    await expect(page.locator('#stat-total')).toHaveText('1');
    await expect(page.locator('#syncStatus')).toContainText('已同步到账号云端');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('todo_quadrant_data') || '{}').items?.[0]?.title)).toBe('云端任务');
    expect(flow.posts).toEqual([]);
  });

  test('新增、完成改期写入云端；本地旧数据一键导入', async ({ page }) => {
    const flow = await mockTodoSupabase(page);
    await page.goto('/todo/');
    await page.locator('#addTaskBtn').click();
    await page.locator('#taskTitle').fill('云端新增');
    await page.locator('#addModal .quadrant-btn[data-quadrant="3"]').click();
    await page.locator('#btnSubmit').click();
    await expect(page.locator('#addModal')).not.toBeVisible();
    await expect.poll(() => flow.rows.map(row => row.title)).toEqual(expect.arrayContaining(['云端新增']));
    // 完成切换 → PATCH
    await page.locator('.focus-list .task-checkbox').click();
    await expect(page.locator('#stat-rate')).toHaveText('100%');
    await expect.poll(() => flow.rows.some(row => row.title === '云端新增' && row.completed === true)).toBe(true);
    expect(flow.patches.some(patch => patch.completed === true)).toBe(true);
  });

  test('未登录保持本地模式并提示登录', async ({ page }) => {
    await mockTodoSupabase(page, [], false);
    await page.goto('/todo/');
    await page.evaluate(() => localStorage.removeItem('todo_quadrant_data'));
    await page.reload();
    await add(page, '本地任务', 2);
    await expect(page.locator('.focus-list .task-title')).toHaveText('本地任务');
    const sync = page.locator('#syncStatus');
    await expect(sync.locator('a')).toHaveAttribute('href', '/account/');
    await expect(sync).toContainText('登录账号');
  });

  test('云端为空时提示导入本地历史数据，导入后不再询问', async ({ page }) => {
    const flow = await mockTodoSupabase(page);
    await page.addInitScript(() => {
      const now = Date.now();
      const legacy = [{ id: `${now}-legacy1500`, title: '旧任务一', quadrant: 2, createdAt: now, updatedAt: now, completed: false, priority: 'medium' }, { id: `${now}-legacy1501`, title: '旧任务二', quadrant: 1, createdAt: now, updatedAt: now, completed: false, priority: 'low' }];
      localStorage.setItem('todo_quadrant_data', JSON.stringify({ version: 1, lastUpdated: now, items: legacy }));
    });
    await page.goto('/todo/');
    const banner = page.locator('#importBanner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('2 条');
    await page.locator('#importConfirmBtn').click();
    await expect(page.locator('.focus-list .task-title')).toHaveText(['旧任务一', '旧任务二']);
    await expect(flow.rows.map(row => row.title)).toEqual(expect.arrayContaining(['旧任务一', '旧任务二']));
    await page.reload();
    await expect(page.locator('.focus-list .task-title')).toHaveText(['旧任务一', '旧任务二']);
    await expect(banner).toBeHidden();
  });
});
