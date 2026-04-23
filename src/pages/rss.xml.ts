// src/pages/rss.xml.ts
import { getCollection } from 'astro:content';
import { sortPostsByCreateTime } from '../lib/post-utils';

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  sortPostsByCreateTime(posts);

  const site = 'https://fblog.younote.top';

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>书山有路</title>
    <link>${site}</link>
    <description>书山有路勤为径，学海无涯苦作舟</description>
    <language>zh-CN</language>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.map((post) => `
    <item>
      <title>${post.data.title}</title>
      <link>${site}/posts/${post.id}/</link>
      <description>${post.data.description || ''}</description>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <guid>${site}/posts/${post.id}/</guid>
      ${post.data.tags?.map((tag) => `<category>${tag}</category>`).join('') || ''}
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