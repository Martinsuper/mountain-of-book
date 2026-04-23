// src/pages/sitemap.xml.ts
import { getCollection } from 'astro:content';
import { sortPostsByCreateTime } from '../lib/post-utils';

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  sortPostsByCreateTime(posts);

  const site = 'https://fblog.younote.top';
  const staticPages = [
    '/',
    '/archive/',
    '/timeline/',
    '/collection/',
    '/tags/',
    '/dev/'
  ];

  const now = new Date().toUTCString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages.map((path) => `
  <url>
    <loc>${site}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
  ${posts.map((post) => `
  <url>
    <loc>${site}/posts/${post.id}/</loc>
    <lastmod>${post.data.date.toUTCString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('')}
  ${posts.flatMap((post) => post.data.tags || []).map((tag) => `
  <url>
    <loc>${site}/tags/${tag}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  `).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}