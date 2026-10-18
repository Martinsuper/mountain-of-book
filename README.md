# 书山有路（mountain-of-book）

个人技术博客，基于 **Astro 5 + Tailwind CSS 3** 的纯静态站点，部署在 GitHub Pages。

- 线上地址：`https://fblog.younote.top`（RSS / sitemap / 搜索索引齐全）
- 文章源文件：`src/content/posts/*.md`
- 写作规范（AI agent 与人类共同遵守）：见 `CLAUDE.md`

## 特性

- Shiki 代码高亮（GitHub Dark 主题）/ PlantUML 与 Mermaid 图表
- 暗色模式、分类与标签归档、时间线、阅读时长、目录自动生成
- 搜索（`search-index.json`）、RSS、sitemap、草稿/发布工作流
- `mcp/` 内置 **book-blog MCP server**——agent 可通过 MCP 直接读写/检索文章（见 `mcp/INSTALL.md`）

## 快速开始

```bash
# 安装依赖（必须用 pnpm）
pnpm install

# 启动开发服务器（端口 4321）
pnpm dev

# 构建（构建前会自动跑 PlantUML 语法校验）
pnpm build

# 预览构建结果
pnpm preview

# 端到端测试（需 dev server 运行）
pnpm test
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务器（4321；测试用 4322） |
| `pnpm build` | PlantUML 校验 + 构建（输出 `dist/`） |
| `pnpm check-plantuml` | 单独校验文章中的 PlantUML 语法（本地 JAR，需 Java 11+） |
| `pnpm test` | Playwright 端到端测试 |
| `pnpm mcp:build` / `pnpm mcp:smoke` | 构建 / 自检 MCP server（`cd mcp && npm install` 已含） |

## 部署

主力部署为 **GitHub Pages**：推送到 `main` 触发 `.github/workflows/deploy.yml` 自动构建部署。Cloudflare Pages 配置（`wrangler.toml`）仅作备用，不主动使用。

部署前检查清单见 `CLAUDE.md` §3.3（构建零错误、PlantUML 校验通过、frontmatter 合规等）。

## 目录结构

```text
├── src/
│   ├── content/posts/     # Markdown 文章（核心内容目录）
│   ├── lib/categories.ts  # 分类事实来源（zod schema 构建时校验）
│   ├── pages/             # 路由页面（文章/归档/时间线/API）
│   ├── components/        # Astro 组件
│   └── lib/               # 工具函数和 remark 插件
├── mcp/                   # book-blog MCP server（agent 写博客入口）
├── docs/                  # 项目文档
├── tests/                 # Playwright 测试
└── .github/workflows/     # GitHub Actions（自动部署）
```

## 用 agent 写作

- **本机 agent**：接入 `mcp/` 的 book-blog MCP 后，直接用自然语言写博客、检索、发布草稿。安装步骤见 `mcp/INSTALL.md`
- **写作规范**：`CLAUDE.md` 是唯一权威（frontmatter、分类树、5 类文章骨架、语气红线）；MCP 的 `get_style_guide` 返回其速查版
- **远程只读**：任何 agent 直接 fetch `https://fblog.younote.top/api/search-index.json` 即可检索全部已发布文章

更多文档见 `docs/`（开发指南 `docs/DEVELOPMENT.md` 等）。
