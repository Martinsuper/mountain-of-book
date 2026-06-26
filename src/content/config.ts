// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// 合法分类（与 CLAUDE.md 约定保持一致）
export const CATEGORIES = ['AI 工程', '工具教程', '前端开发', '后端开发'] as const;

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    category: z.enum(CATEGORIES).optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

export const collections = {
  posts: postsCollection
};
