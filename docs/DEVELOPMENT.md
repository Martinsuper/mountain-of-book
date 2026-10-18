# 开发指南

> 写作规范、frontmatter 格式、文章骨架的唯一权威是仓库根 `CLAUDE.md`——本文不重复，只写本地开发流程。构建失败、图表渲染等问题优先查 `CLAUDE.md` §一 的排查表。

## 本地开发

```bash
pnpm install        # 必须用 pnpm（不要用 npm/yarn）
pnpm dev            # 开发服务器，端口 4321；本地环境变量放 .env.local（已 gitignore）
pnpm build          # PlantUML 校验 + 构建
pnpm preview        # 预览构建结果，端口 4321
```

遇到构建报错时删除 `.astro/` 缓存目录重启；服务需要局域网/远程访问见 `src/content/posts/astro-dev-server-remote-access.md` 这篇已发布文章。

## 开发模式中间件 API（astro.config.mjs）

仅 dev server 下可用，供 dev 专用页面调用：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/create-post` | POST | 创建新文章（自动生成 slug 与 frontmatter） |
| `/api/publish-post` | POST | `draft: true → false` |
| `/api/unpublish-post` | POST | `draft: false → true` |
| `/api/read-post` | GET | 读取文章原文 |
| `/api/save-post` | POST | 保存文章内容 |

## 创建文章的三种方式

1. **让 agent 通过 book-blog MCP 写**（推荐，自动校验 frontmatter 与分类树）——安装见 `../mcp/INSTALL.md`
2. 直接在 `src/content/posts/` 新建 `.md` 文件，frontmatter 按 `CLAUDE.md` §2.1（注意分类树规则）
3. dev 模式调用上述中间件 API

写完后必跑：`pnpm check-plantuml`（含 PlantUML 的文章）→ `pnpm build` → `pnpm preview` 目检。

## 测试

```bash
pnpm test   # Playwright 需 dev server 运行（测试用 4322 端口）
```

测试文件在 `tests/`，命名 `{功能}.spec.ts`。

## 文档索引

| 文档 | 内容 |
|------|------|
| `../CLAUDE.md` | 写作规范与 AI 工作约束（权威） |
| `../mcp/INSTALL.md` | book-blog MCP 安装与接入 |
| `account-setup.md` | 账号/会员相关功能 |
| `calendar-subscription.md` | 日历订阅功能 |
