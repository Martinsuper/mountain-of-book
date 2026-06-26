import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkPlantUml from './src/lib/remark-plantuml';
import remarkMermaid from './src/lib/remark-mermaid';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取项目根目录
const projectRoot = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(projectRoot, 'src/content/posts');

// 将外部传入的 slug 解析为 posts 目录下的安全路径，防止路径遍历（../、绝对路径等）。
// 非法 slug 返回 null。
function resolveSafePostPath(slug) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  // 只取最后一段文件名，剥离任何目录成分
  const base = slug.replace(/\.md$/, '');
  if (base.includes('/') || base.includes('\\') || base.includes('..')) return null;
  const filePath = join(POSTS_DIR, `${base}.md`);
  // 双重保险：确保最终路径仍位于 posts 目录内
  if (!filePath.startsWith(POSTS_DIR + '/')) return null;
  return filePath;
}

// 开发模式下创建和发布文章的中间件
const devMiddleware = () => ({
  name: 'dev-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // 创建新文章
      if (req.url === '/api/create-post' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { title } = JSON.parse(body);
            if (!title) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '标题不能为空' }));
              return;
            }

            // 生成slug
            const slug = title
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^\w\-\u4e00-\u9fa5]/g, '')
              || `post-${Date.now()}`;

            const date = new Date().toISOString().split('T')[0];
            const content = `---
title: ${title}
description: ''
date: ${date}
tags: []
draft: true
---

在这里开始写你的文章...
`;

            const filePath = resolveSafePostPath(slug);
            if (!filePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '无法从标题生成合法的文件名' }));
              return;
            }
            writeFileSync(filePath, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, slug }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
      // 发布文章（将 draft: true 改为 draft: false）
      else if (req.url === '/api/publish-post' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { slug } = JSON.parse(body);
            if (!slug) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文章标识' }));
              return;
            }

            const filePath = resolveSafePostPath(slug);
            if (!filePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '非法的文章标识' }));
              return;
            }
            if (!existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文章不存在: ${slug}` }));
              return;
            }

            // 读取文件并修改 draft 字段
            let content = readFileSync(filePath, 'utf-8');
            content = content.replace(/draft:\s*true/, 'draft: false');
            writeFileSync(filePath, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
      // 取消发布（将 draft: false 改为 draft: true）
      else if (req.url === '/api/unpublish-post' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { slug } = JSON.parse(body);
            if (!slug) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文章标识' }));
              return;
            }

            const filePath = resolveSafePostPath(slug);
            if (!filePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '非法的文章标识' }));
              return;
            }
            if (!existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: '文章不存在' }));
              return;
            }

            let content = readFileSync(filePath, 'utf-8');
            content = content.replace(/draft:\s*false/, 'draft: true');
            writeFileSync(filePath, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
      else {
        next();
      }
    });
  }
});

export default defineConfig({
  site: 'https://fblog.younote.top',
  server: { host: true },
  integrations: [tailwind()],
  output: 'static',
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    },
    remarkPlugins: [remarkPlantUml, remarkMermaid]
  },
  publicDir: 'public',
  vite: {
    plugins: [devMiddleware()]
  }
});
