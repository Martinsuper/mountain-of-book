import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkPlantUml from './src/lib/remark-plantuml';
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取项目根目录
const projectRoot = dirname(fileURLToPath(import.meta.url));

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

            const filePath = join(projectRoot, 'src/content/posts', `${slug}.md`);
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

            const filePath = join(projectRoot, 'src/content/posts', `${slug}.md`);
            if (!existsSync(filePath)) {
              // 尝试查找可能匹配的文件
              const postsDir = join(projectRoot, 'src/content/posts');
              const files = readdirSync(postsDir);
              console.log('Looking for:', slug);
              console.log('Available files:', files);
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文章不存在: ${slug}`, path: filePath }));
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

            const filePath = join(projectRoot, 'src/content/posts', `${slug}.md`);
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
    remarkPlugins: [remarkPlantUml]
  },
  publicDir: 'public',
  vite: {
    plugins: [devMiddleware()]
  }
});
