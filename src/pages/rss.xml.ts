import type { APIContext } from 'astro';
// src/pages/rss.xml.ts
import { getCollection } from 'astro:content';
import { sortPostsByDate } from '../lib/post-utils';
import { escapeXml } from '../lib/xml';

export async function GET({ site }: APIContext) {
  if (!site) throw new Error('站点 URL 尚未配置');
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  sortPostsByDate(posts);

  const siteUrl = site.href.replace(/\/$/, '');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>书山有路</title>
    <link>${siteUrl}</link>
    <description>书山有路勤为径，学海无涯苦作舟</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.map((post) => `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(new URL(`/posts/${encodeURIComponent(post.id)}/`, site).href)}</link>
      <description>${escapeXml(post.data.description || '')}</description>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <guid>${escapeXml(new URL(`/posts/${encodeURIComponent(post.id)}/`, site).href)}</guid>
      ${post.data.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join('') || ''}
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8'
    }
  });
}