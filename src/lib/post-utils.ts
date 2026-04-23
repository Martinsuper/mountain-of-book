// src/lib/post-utils.ts
import { statSync } from 'fs';
import { join } from 'path';
import type { CollectionEntry } from 'astro:content';

const POSTS_DIR = 'src/content/posts';

/**
 * 按文件创建时间倒序排列文章
 * 若创建时间不可用则使用修改时间
 */
export function sortPostsByCreateTime(posts: CollectionEntry<'posts'>[]): CollectionEntry<'posts'>[] {
  return posts.sort((a, b) => {
    const aPath = join(POSTS_DIR, a.id);
    const bPath = join(POSTS_DIR, b.id);
    const aTime = statSync(aPath).birthtimeMs || statSync(aPath).mtimeMs;
    const bTime = statSync(bPath).birthtimeMs || statSync(bPath).mtimeMs;
    return bTime - aTime;
  });
}

/**
 * 按年份分组文章
 */
export function groupPostsByYear(posts: CollectionEntry<'posts'>[]): Map<number, CollectionEntry<'posts'>[]> {
  const groups = new Map<number, CollectionEntry<'posts'>[]>();
  posts.forEach((post) => {
    const year = post.data.date.getFullYear();
    const existing = groups.get(year) || [];
    groups.set(year, [...existing, post]);
  });
  return groups;
}