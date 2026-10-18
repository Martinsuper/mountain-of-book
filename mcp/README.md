# book-blog MCP Server

「书山有路」博客的 MCP server（stdio 传输），让任意支持 MCP 的 agent 直接读写、检索、校验博客文章。

## 工具列表

| 工具 | 说明 |
|------|------|
| `list_posts` | 列出文章元信息，支持按分类/标签/草稿状态/关键词过滤 |
| `search_posts` | 全文检索（标题权重 > 描述/标签 > 正文），返回分数与摘要 |
| `read_post` | 读取文章完整内容（frontmatter + 正文） |
| `create_post` | 创建文章：自动校验 frontmatter、按 CLAUDE.md 规范生成文件；中文标题必须传显式 slug |
| `update_post` | 更新正文和/或 frontmatter，校验失败不保存 |
| `set_draft` | 发布（draft: false）/ 转回草稿（draft: true） |
| `delete_post` | 删除文章，必须显式 `confirm: true` |
| `check_plantuml` | 用本地 PlantUML JAR 校验文章中的 PlantUML 语法 |
| `get_style_guide` | 返回写作规范速查 + 5 类文章骨架 |
| `site_stats` | 站点统计：总数、草稿数、分类分布、热门标签、最近文章 |

内置约束（以 `src/content/config.ts` 的 zod schema 和 `src/lib/categories.ts` 为准）：

- 分类白名单：`AI 工程` / `开发工具` / `软件工程` / `应用开发`（设置 `category` 时 `subcategory` 必填，来源：仓库根 `src/lib/categories.ts`）
- slug 只允许小写英文/数字 + 连字符；含中文的标题必须显式提供 slug
- 新文章默认 `draft: true`
- 写入采用「临时文件 + rename」原子写，防并发损坏；slug 路径穿越校验与 astro.config.mjs 一致

## 安装与构建

```bash
cd mcp
npm install
npm run build        # 产出 dist/index.js
npm run smoke        # 21 项冒烟测试（会创建/删除临时测试文章，验证后清理）
```

> 注意：`check_plantuml` 依赖 `bin/plantuml.jar` 和 Java 11+；JAR 未下载时该工具会提示安装命令，其他工具不受影响。

## Agent 接入配置

根目录通过环境变量 `BLOG_ROOT` 指定（默认取 `mcp/` 的上一级目录）。

### Claude Code

```bash
claude mcp add book-blog -- node /Volumes/W_W/claude-workspace/mountain-of-book/mcp/dist/index.js
```

或项目级 `.mcp.json`：

```json
{
  "mcpServers": {
    "book-blog": {
      "command": "node",
      "args": ["/Volumes/W_W/claude-workspace/mountain-of-book/mcp/dist/index.js"]
    }
  }
}
```

### 其他 agent（OpenCode / Cursor / Codex 等）

JSON 配置格式一致：

```json
{
  "mcpServers": {
    "book-blog": {
      "command": "node",
      "args": ["/Volumes/W_W/claude-workspace/mountain-of-book/mcp/dist/index.js"]
    }
  }
}
```

OpenCode 对应配置写在 `opencode.json` 的 `mcp` 字段；Cursor 写在 `~/.cursor/mcp.json`。

## 与部署的关系

MCP 只修改本地 `src/content/posts/` 的文件。**发布 = 调用方自行 `git commit` + `push` 到 main**，由 GitHub Actions 构建部署。MCP 不执行任何 git 操作。

## 文件结构

```text
mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts       # MCP server 入口，注册 10 个工具
│   ├── blog.ts        # 文章 CRUD / 检索 / 统计
│   ├── frontmatter.ts # frontmatter 解析、序列化、规范校验
│   ├── paths.ts       # 根目录解析、slug 校验、原子写
│   ├── skeletons.ts   # 5 类文章骨架 + 写作规范文本
│   └── plantuml.ts    # PlantUML 语法校验（调用 scripts/validate-plantuml.sh）
├── test/
│   └── smoke.mjs      # stdio JSON-RPC 冒烟测试
└── dist/              # 构建产物（gitignore）
```
