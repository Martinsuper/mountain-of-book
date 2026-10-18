# book-blog MCP 安装文档

> 「书山有路」博客 MCP server 的安装与使用说明。让任何支持 MCP 的 agent（OpenCode、Claude Code、Codex、Cursor 等）直接读写、检索、校验博客文章。

## 项目概况

| 项 | 值 |
|----|-----|
| MCP 源码位置 | `<仓库根>/mcp/` |
| 入口文件 | `<仓库根>/mcp/dist/index.js`（构建产物） |
| 传输方式 | stdio（本地进程，零网络依赖） |
| 数据源 | `src/content/posts/*.md`（本地 markdown 源文件） |
| Node.js 要求 | ≥ 20 |
| 工具数量 | 10 个 |

### 工具一览

| 工具 | 功能 |
|------|------|
| `list_posts` | 列出文章，按分类/标签/草稿状态/关键词过滤 |
| `search_posts` | 全文检索（标题权重最高），返回分数与摘要 |
| `read_post` | 读取文章完整内容 |
| `create_post` | 创建文章，自动校验并写入合规 frontmatter（中文标题必须显式传英文 slug） |
| `update_post` | 更新正文和/或 frontmatter，校验失败不保存 |
| `set_draft` | 发布（draft: false）/ 转回草稿（draft: true） |
| `delete_post` | 删除文章，必须显式传 `confirm: true` |
| `check_plantuml` | 用本地 PlantUML JAR 校验文章中的 PlantUML 语法 |
| `get_style_guide` | 返回写作规范（分类白名单、命名规则、5 类文章骨架） |
| `site_stats` | 站点统计：总数、草稿数、分类分布、热门标签 |

内置约束（与 `src/content/config.ts` 的 zod schema 和 `src/lib/categories.ts` 一致，后者是唯一事实来源）：

- 分类白名单：`AI 工程` / `开发工具` / `软件工程` / `应用开发`；设置 `category` 时 `subcategory` 必填且须属于分类树
- slug 只允许小写英文/数字 + 连字符；含中文的标题必须显式提供 slug
- 标题 50 字、标签 1-5 个等均为建议项（工具会提示，不阻塞保存）；新文章默认 `draft: true`
- 写入采用「临时文件 + rename」原子写，防并发损坏；slug 路径穿越校验与 astro.config.mjs 一致

> 注意：MCP 只修改本地文件。**发布 = 自行 `git commit` + `push` 到 main**，由 GitHub Actions 构建部署，MCP 不做任何 git 操作。

---

## 安装步骤

在每台需要使用的电脑上执行一次。

### 1. Clone 仓库

```bash
git clone <仓库地址>
cd mountain-of-book
```

### 2. 构建 MCP

`mcp/dist/` 是构建产物，不在 git 中，新电脑必须重新构建：

```bash
cd mcp
npm install
npm run build   # 产出 dist/index.js
```

### 3.（仅需要 PlantUML 校验时）准备 Java + JAR

`bin/plantuml.jar` 因体积原因不在 git 中，只影响 `check_plantuml` 一个工具，其余 9 个工具不装也可用。

```bash
# 系统 Java 11+（Homebrew：brew install openjdk@17）
curl -L -o bin/plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2025.2/plantuml-1.2025.2.jar
java -jar bin/plantuml.jar -version   # 验证
```

### 4. 注册到 agent

路径必须指向**这台电脑**上的 clone 位置（每台电脑的绝对路径不同）。

**OpenCode**：

```bash
# 项目级：只在新电脑的博客项目里可用
opencode mcp add book-blog -- node /新电脑路径/mountain-of-book/mcp/dist/index.js

# 全局：新电脑上任何项目都能读写博客
opencode mcp add book-blog --global -- node /新电脑路径/mountain-of-book/mcp/dist/index.js
```

**Claude Code**：

```bash
claude mcp add book-blog -- node /新电脑路径/mountain-of-book/mcp/dist/index.js
```

**Cursor**（`~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "book-blog": {
      "command": "node",
      "args": ["/新电脑路径/mountain-of-book/mcp/dist/index.js"]
    }
  }
}
```

**Codex**（`~/.codex/config.toml`）

```toml
[mcp_servers.book-blog]
command = "node"
args = ["/新电脑路径/mountain-of-book/mcp/dist/index.js"]
```

### 5. 验证连接

```bash
opencode mcp list        # 应显示 ✓ book-blog  connected
```

Claude Code 在会话内输入 `/mcp` 确认；OpenCode 用 `/mcps` 查看。

连上后向 agent 随口问一句即可验证全链路，例如「博客现在有多少篇文章、几篇草稿？」——agent 会调用 `site_stats`。

---

## 使用方式

接入后无需记忆任何命令，在对话中用自然语言描述意图，agent 自动选择工具：

| 你说 | agent 调用 |
|------|-----------|
| 「列出博客里的所有草稿」 | `list_posts(draft: true)` |
| 「搜一下关于 mcp 的文章」 | `search_posts` |
| 「写一篇原理解析型的《xxx 入门》，存成草稿」 | `get_style_guide` → `create_post`（自动生成合规 frontmatter + 骨架） |
| 「这篇里的 PlantUML 都能渲染吗？」 | `check_plantuml` |
| 「把 xxx 发布」 | `update_post(draft: false)`，之后仍需自行 push |

在 OpenCode Code Mode 下工具名形如 `tools.book_blog.create_post(...)`；agent 会自行处理。

**新文章建议**：中文标题的 slug 让 agent 明确给出（如 `plantuml-quick-start`）；包含 PlantUML 的文章写完务必让 agent 调 `check_plantuml`，通过后再提交。

---

## 多机注意事项

1. **内容不自动同步**：MCP 只改本机 clone 的文件。多台电脑都写作时，写作前先 `git pull`，写完尽快 `git push`，避免分叉。
2. **不要手动改 `dist/`**：改了也会在下次构建时被覆盖。改逻辑请改 `mcp/src/` 后重新构建。
3. `check_plantuml` 依赖 Java 11+；macOS 上如果报 `libfontmanager`/`libglib` 加载错误，执行 `brew link glib` 可修复（Homebrew 符号链接丢失导致的已知问题）。

---

## 冒烟测试（可选但推荐）

新电脑装完建议跑一遍自检，共 21 项，会临时创建一篇测试文章并在结束后删除：

```bash
cd mcp
npm run smoke 2>&1 | grep -v '^\[server\]'
# 预期最后一行：全部通过
```
