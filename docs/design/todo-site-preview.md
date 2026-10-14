# 待办页：站点内预览

访问已有 Astro 开发服务：http://localhost:4321/dev/todo-preview/

此预览复用真实 BaseLayout、导航和主题按钮，只比较 A「轻量四象限」与 B「专注清单」。用户已选定 B，正式待办页现已应用专注清单布局，访问 http://localhost:4321/todo/ 。任务存储键与结构保持不变；此设计预览中的示例任务只保存在页面内存中。

## 查看方式

1. 打开预览地址，在顶部选择 A 或 B。
2. 使用站点导航栏的主题按钮切换浅色、暗色、紫色。
3. 搜索、完成或添加示例任务，体验不同布局。

## 效果图

- [A：浅色](todo-site-a-light.png)
- [B：浅色](todo-site-b-light.png)
- [A：暗色](todo-site-a-dark.png)
- [B：暗色](todo-site-b-dark.png)
- [A：紫色](todo-site-a-purple.png)
- [B：紫色](todo-site-b-purple.png)

页面样式限定于 `.todo-preview`，不修改共享布局或全局样式。导航尺寸、字体、背景和边框已与现有待办页对照验证。正式页使用专注清单，保留新增、编辑、完成、归档恢复、删除撤销、批量操作、JSON/CSV 导出和日历交互。任务可拖到象限筛选按钮重新分类，日历内拖拽可改期。清单自动按日期与优先级排序，不提供手动排序。

## 正式页回归测试

使用项目已有 Playwright 浏览器：

```bash
pnpm exec playwright test --config docs/design/playwright-todo.config.ts
```

没有安装 Playwright 浏览器时，可以指定本机 Chrome，测试复用 4321 端口上的 Astro 服务：

```bash
TODO_TEST_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm exec playwright test --config docs/design/playwright-todo.config.ts
```

可通过 `TODO_TEST_URL` 指定其他服务地址。8 项回归测试覆盖数据兼容性、日期分组、筛选搜索、增删改、归档恢复、撤销、拖拽分类与改期、批量完成、导出、主题和响应式宽度。

- [正式页桌面效果](todo-final-desktop.png)
- [正式页移动端效果](todo-final-mobile.png)
