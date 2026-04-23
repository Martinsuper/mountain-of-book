---
title: "Astro 快速上手指南"
description: "从零开始搭建你的第一个 Astro 博客项目，介绍安装、项目结构、组件基础、路由系统、布局组件及部署方式"
date: 2026-04-23
tags: ["astro", "frontend", "static-site", "blog"]
draft: false
---

## Astro 快速上手指南

Astro 是一款现代化的静态站点生成器，专为内容驱动的网站设计。它采用独特的 **Islands 架构**，让你可以在静态页面中按需添加交互组件。

## 为什么选择 Astro？

- **零 JavaScript 默认输出** — 生成的页面默认不包含 JavaScript，极致轻量
- **Islands 架构** — 仅在需要交互的地方加载 JavaScript
- **框架无关** — 可以混用 React、Vue、Svelte 等组件
- **内容优先** — 完美支持 Markdown、MDX，适合博客、文档站

## 安装要求

在开始之前，确保你的环境满足以下要求：

- **Node.js**: `v22.12.0` 或更高版本（注意：奇数版本如 v23 不支持）
- **文本编辑器**: 推荐 VS Code
- **终端**: 命令行工具

## 快速安装

### 使用 CLI 向导（推荐）

打开终端，运行以下命令：

```bash
npm create astro@latest
```

或者使用其他包管理器：

```bash
pnpm create astro@latest
yarn create astro
```

CLI 向导会引导你完成以下步骤：

1. 选择项目名称
2. 选择模板（博客、文档、空白项目等）
3. 安装依赖
4. 初始化 Git 仓库

### 常用选项

创建项目时可以直接指定配置：

```bash
# 添加集成（如 React）
npm create astro@latest -- --add react --add partytown

# 使用特定模板
npm create astro@latest -- --template blog
```

## 项目结构

创建完成后，你的项目目录结构如下：

```
my-astro-project/
├── src/
│   ├── pages/        # 必需！页面文件，决定网站路由
│   ├── components/   # 可复用的组件
│   ├── layouts/      # 页面布局模板
│   └── styles/       # CSS/SCSS 样式文件
├── public/           # 静态资源（不处理，直接复制）
├── package.json      # 项目配置
├── astro.config.mjs  # Astro 配置文件
└── tsconfig.json     # TypeScript 配置（可选）
```

### 核心目录说明

| 目录/文件 | 说明 |
|----------|------|
| `src/pages/` | **必需目录**，文件路径决定 URL 路由 |
| `src/components/` | 可复用的 UI 组件 |
| `src/layouts/` | 页面共享布局结构 |
| `public/` | 静态文件，构建时直接复制，不经过处理 |

## Astro 组件基础

Astro 组件使用 `.astro` 文件扩展名，由两部分组成：

### 组件结构

```astro
---
// 组件脚本（Frontmatter）
// 这里的 JavaScript 只在构建时运行，不会发送到客户端
const title = "我的博客";
---

<!-- 组件模板 -->
<!-- HTML 模板部分 -->
<html>
  <head>
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
  </body>
</html>

<style>
  /* 组件样式，自动 scoped */
  h1 {
    color: blue;
  }
</style>
```

### Frontmatter 说明

- 位于 `---` 之间的代码块
- 只在服务端/构建时执行
- 可以导入其他组件、定义变量、获取数据

### Props 传递

```astro
---
// 接收外部传入的属性
const { title, author } = Astro.props;
---

<article>
  <h2>{title}</h2>
  <p>作者：{author}</p>
</article>
```

使用组件时：

```astro
---
import ArticleCard from '../components/ArticleCard.astro';
---

<ArticleCard title="Hello Astro" author="开发者" />
```

## 页面与路由

Astro 采用 **文件系统路由**，`src/pages/` 目录中的文件自动生成对应的 URL：

| 文件路径 | 生成的 URL |
|---------|-----------|
| `src/pages/index.astro` | `/` |
| `src/pages/about.astro` | `/about` |
| `src/pages/blog/index.astro` | `/blog/` |
| `src/pages/blog/post.astro` | `/blog/post` |

### 创建第一个页面

```astro
---
// src/pages/index.astro
const pageTitle = "首页";
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{pageTitle}</title>
  </head>
  <body>
    <h1>欢迎来到我的博客</h1>
    <nav>
      <a href="/">首页</a>
      <a href="/about">关于</a>
      <a href="/blog">博客文章</a>
    </nav>
  </body>
</html>
```

**注意**: 使用 URL 路径作为链接（如 `/about`），而不是相对文件路径。

## 使用布局组件

布局组件让多个页面共享相同的结构：

```astro
---
// src/layouts/BaseLayout.astro
const { title } = Astro.props;
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
  </head>
  <body>
    <nav>
      <a href="/">首页</a>
      <a href="/blog">博客</a>
    </nav>
    <main>
      <slot /> <!-- 页面内容插入点 -->
    </main>
    <footer>
      <p>© 2024 我的博客</p>
    </footer>
  </body>
</html>
```

页面中使用布局：

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="首页">
  <h1>欢迎来到我的博客</h1>
  <p>这是首页内容...</p>
</BaseLayout>
```

## 开发与构建

### 启动开发服务器

```bash
npm run dev
```

默认在 `http://localhost:4321` 启动，支持热更新。

### 构建生产版本

```bash
npm run build
```

输出到 `dist/` 目录，可直接部署。

### 预览构建结果

```bash
npm run preview
```

## Markdown 博客文章

Astro 原生支持 Markdown，非常适合博客：

```markdown
---
# src/pages/blog/first-post.md
title: 第一篇博客
description: 我的 Astro 博客之旅
publishDate: 2024-01-15
---

# 第一篇博客

这是我的第一篇 Astro 博客文章！

## 为什么选择 Astro

- 快速
- 轻量
- 易于使用
```

在页面中列出所有文章：

```astro
---
// src/pages/blog/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';

// 获取所有 Markdown 文件
const posts = await Astro.glob('./**/*.md');
---

<BaseLayout title="博客">
  <h1>博客文章</h1>
  <ul>
    {posts.map((post) => (
      <li>
        <a href={post.url}>{post.frontmatter.title}</a>
        <span>{post.frontmatter.publishDate}</span>
      </li>
    ))}
  </ul>
</BaseLayout>
```

## 部署

Astro 构建的是纯静态文件，可以部署到多种平台：

- **Vercel** — `npm create astro@latest -- --add vercel`
- **Netlify** — `npm create astro@latest -- --add netlify`
- **Cloudflare Pages** — 直接上传 `dist/` 目录
- **GitHub Pages** — 配置输出目录即可

## 下一步学习

- [Astro 官方文档](https://docs.astro.build)
- [博客教程](https://docs.astro.build/en/tutorial/) — 六单元完整教程
- [组件模板语法](https://docs.astro.build/en/basics/astro-syntax/)
- [内容集合](https://docs.astro.build/en/guides/content/) — 类型安全的内容管理

## 总结

Astro 是构建内容驱动网站的绝佳选择：

| 特点 | 说明 |
|-----|------|
| 安装简单 | 一行命令即可创建项目 |
| 文件路由 | pages 目录决定 URL 结构 |
| 组件化 | 可复用的 Astro 组件 |
| Markdown 支持 | 原生支持，适合博客 |
| 静态输出 | 可部署到任何静态托管 |

开始你的 Astro 之旅吧！运行 `npm create astro@latest` 创建你的第一个项目。