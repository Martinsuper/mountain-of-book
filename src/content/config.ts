import { defineCollection, z } from 'astro:content';
import { CATEGORIES, isSubcategory } from '../lib/categories';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    category: z.enum(CATEGORIES).optional(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  }).superRefine((data, ctx) => {
    if (data.category && !data.subcategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subcategory'],
        message: '已设置 category 时必须设置 subcategory'
      });
    }

    if (!data.category && data.subcategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subcategory'],
        message: '已设置 subcategory 时必须设置 category'
      });
    }

    if (data.category && data.subcategory && !isSubcategory(data.category, data.subcategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subcategory'],
        message: 'subcategory 不属于当前 category'
      });
    }
  })
});

export const collections = {
  posts: postsCollection
};
