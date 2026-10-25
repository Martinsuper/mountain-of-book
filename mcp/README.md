# book-blog MCP Server

「书山有路」博客的 MCP server（stdio 传输），让任意支持 MCP 的 agent 直接读写、检索、校验博客文章。

内容源有两个，互不同步：

- **本地 Markdown**（`src/content/posts/*.md`）：公开的正式博客文章，有 frontmatter（分类/标签/slug）；发布 = 自行 git push 触发构建
- **云端文章**（Supabase `public.articles` 表）：登录可见/指定账号可见的私密内容，只有标题 + Markdown 正文；保存即生效，无需部署

## 工具列表（19 个）

**Markdown 文章：**

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
| `get_style_guide` | 返回写作规范速查（含内容源选择指南）+ 5 类文章骨架 |
| `site_stats` | 站点统计：总数、草稿数、分类分布、热门标签、最近文章 |

**云端文章（需站长凭据，见下方环境变量）：**

| 工具 | 说明 |
|------|------|
| `list_cloud_posts` | 列出云端文章元信息，按状态/可见范围/标题关键词过滤 |
| `search_cloud_posts` | 检索云端文章（标题权重 > 正文），返回分数与摘要 |
| `read_cloud_post` | 按 UUID 读取全文；阅读地址 `/posts/read/?id=<uuid>` |
| `create_cloud_post` | 创建：默认草稿 + 登录可见；restricted 仅限历史存量，创建时不可选 |
| `update_cloud_post` | 更新标题和/或正文（全文替换） |
| `set_cloud_status` | 发布（published，立即生效）/ 转回草稿（draft，立即下线） |
| `set_cloud_visibility` | 设置可见范围 authenticated / public；restricted 只读保持 |
| `delete_cloud_post` | 永久删除数据库行，必须显式 `confirm: true` |
| `grant_cloud_post` | 给历史 restricted 文章按邮箱追加授权（复用 `admin_grant_article` RPC） |

Markdown 内置约束（以 `src/content/config.ts` 的 zod schema 和 `src/lib/categories.ts` 为准）：

- 分类白名单：`AI 工程` / `开发工具` / `软件工程` / `应用开发`（设置 `category` 时 `subcategory` 必填，来源：仓库根 `src/lib/categories.ts`）
- slug 只允许小写英文/数字 + 连字符；含中文的标题必须显式提供 slug
- 新文章默认 `draft: true`
- 写入采用「临时文件 + rename」原子写，防并发损坏；slug 路径穿越校验与 astro.config.mjs 一致

云端内置约束（与 `supabase/migrations/` 的 RLS 策略和管理页语义一致）：

- 凭据未配置时 `*_cloud_*` 工具返回配置指引，Markdown 工具不受影响
- 写入用站长账号登录（`site_admins` 成员），RLS `articles_admin_all` 仍生效；密码错误报「登录失败」
- 新文章默认 `draft: true`、`visibility: authenticated`；`restricted` 不可新建，只能对存量文章授权
- 云端阅读页用 marked + DOMPurify 渲染、不渲染 PlantUML/Mermaid，正文含相关代码块时返回 styleWarnings
- 删除必须显式 `confirm: true`

## 安装与构建

```bash
cd mcp
npm install
npm run build        # 产出 dist/index.js
npm run smoke        # 冒烟测试：21 项 Markdown 用例（会创建/删除临时测试文章）+ 探测到云端凭据时追加云端用例
npm run smoke:cloud  # 云端工具本地联调：内置最小 Supabase mock，无需真实凭据
```

> 注意：`check_plantuml` 依赖 `bin/plantuml.jar` 和 Java 11+；JAR 未下载时该工具会提示安装命令，其他工具不受影响。

## 云端文章凭据配置

`*_cloud_*` 工具需要站长账号凭据，解析优先级：**进程环境变量 > `BLOG_ROOT/.env.local` > `BLOG_ROOT/.env`**。

| 变量 | 说明 |
|------|------|
| `BLOG_SUPABASE_URL` | 项目 URL（缺省回退站点同名 `PUBLIC_SUPABASE_URL`） |
| `BLOG_SUPABASE_ANON_KEY` | anon key（缺省回退 `PUBLIC_SUPABASE_ANON_KEY`；二者本就是公开值） |
| `BLOG_SUPABASE_ADMIN_EMAIL` | 站长账号邮箱（须在 `site_admins` 表中） |
| `BLOG_SUPABASE_ADMIN_PASSWORD` | 站长账号密码 |

推荐直接写进 MCP 配置的 `env` 字段：

```json
{
  "mcpServers": {
    "book-blog": {
      "command": "node",
      "args": ["/Volumes/W_W/claude-workspace/mountain-of-book/mcp/dist/index.js"],
      "env": {
        "BLOG_SUPABASE_URL": "https://xxx.supabase.co",
        "BLOG_SUPABASE_ANON_KEY": "eyJ...",
        "BLOG_SUPABASE_ADMIN_EMAIL": "you@example.com",
        "BLOG_SUPABASE_ADMIN_PASSWORD": "..."
      }
    }
  }
}
```

凭据只留在本机 MCP 进程内；写入权限由 Supabase RLS（站长策略）把关，与浏览器管理页 `/account/admin` 等价。不用云端工具时不配置即可。

## Agent 接入配置

根目录通过环境变量 `BLOG_ROOT` 指定（默认取 `mcp/` 的上一级目录）。

### Claude Code

```bash
claude mcp add book-blog -- node /Volumes/W_W/claude-workspace/mountain-of-book/mcp/dist/index.js
```

或项目级 `.mcp.json`（云端凭据写法见上文）：

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

- **Markdown 工具**只修改本地 `src/content/posts/` 的文件。**发布 = 调用方自行 `git commit` + `push` 到 main**，由 GitHub Actions 构建部署。MCP 不执行任何 git 操作。
- **云端工具**直接读写 Supabase（浏览器运行时查询）。**保存即生效**，无需部署；阅读地址为 `/posts/read/?id=<uuid>`，首页按登录会话混排两类文章。

## 文件结构

```text
mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts       # MCP server 入口，注册 19 个工具
│   ├── blog.ts        # Markdown 文章 CRUD / 检索 / 统计
│   ├── cloud.ts       # 云端文章（Supabase）客户端、CRUD、授权
│   ├── frontmatter.ts # frontmatter 解析、序列化、规范校验
│   ├── paths.ts       # 根目录解析、slug 校验、原子写
│   ├── skeletons.ts   # 5 类文章骨架 + 写作规范文本
│   ├── taxonomy.ts    # 分类树（以 src/lib/categories.ts 为单一事实来源）
│   └── plantuml.ts    # PlantUML 语法校验（调用 scripts/validate-plantuml.sh）
├── test/
│   ├── smoke.mjs      # stdio JSON-RPC 冒烟测试（探测到云端凭据时自动追加云端用例）
│   └── cloud-mock.mjs # 云端工具本地联调（内嵌最小 Supabase mock）
└── dist/              # 构建产物（gitignore）
```
