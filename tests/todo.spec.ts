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
