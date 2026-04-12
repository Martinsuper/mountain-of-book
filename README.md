# 我的博客

基于 Astro + Decap CMS 的静态博客，支持后台管理、代码高亮和 PlantUML 流程图。

## 特性

- ✅ 极简设计风格
- ✅ Decap CMS 后台管理
- ✅ 草稿/发布工作流
- ✅ Shiki 代码高亮 (GitHub Dark 主题)
- ✅ PlantUML 流程图渲染
- ✅ 暗色模式支持
- ✅ 标签归档
- ✅ Cloudflare Pages 部署

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 启动 CMS 后台 (单独终端)
npm run dev:cms

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 部署

### 自动部署
推送到 main 分支自动部署到 Cloudflare Pages。

### 手动部署
```bash
wrangler pages deploy dist --project-name=blog
```

## 目录结构

```
├── src/
│   ├── content/        # Markdown 文章
│   ├── layouts/        # Astro 布局
│   ├── pages/          # 页面路由
│   ├── components/     # Astro 组件
│   └── lib/            # 工具函数
├── public/admin/       # Decap CMS 后台
└── .github/workflows/  # GitHub Actions
```
