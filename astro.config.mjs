import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkPlantUml from './src/lib/remark-plantuml';
import { writeFileSync } from 'fs';
import { join } from 'path';

// 开发模式下创建新文章的中间件
const createPostMiddleware = () => ({
  name: 'create-post-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
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

            // 生成slug（中文转拼音或用日期）
            const slug = title
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^\w\-\u4e00-\u9fa5]/g, '')
              || `post-${Date.now()}`;

            // 生成markdown内容
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

            // 写入文件
            const filePath = join(process.cwd(), 'src/content/posts', `${slug}.md`);
            writeFileSync(filePath, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, slug }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else {
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
    plugins: [createPostMiddleware()]
  }
});
