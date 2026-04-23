// src/lib/post-utils.ts
import type { CollectionEntry } from 'astro:content';

/**
 * 按文章日期从新到旧排序
 */
export function sortPostsByDate(posts: CollectionEntry<'posts'>[]): CollectionEntry<'posts'>[] {
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
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