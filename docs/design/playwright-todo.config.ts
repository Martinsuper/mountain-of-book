import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../../tests',
  testMatch: 'todo.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: '../../test-results/todo-redesign',
  use: {
    baseURL: process.env.TODO_TEST_URL || 'http://localhost:4321',
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.TODO_TEST_BROWSER ? { executablePath: process.env.TODO_TEST_BROWSER } : {},
  },
});
