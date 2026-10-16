import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { escapeXml } from '../lib/xml';

export async function GET({ site }: APIContext) {
  if (!site) throw new Error('站点 URL 尚未配置');
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  // 不用每次构建时间冒充内容更新时间；只有文章输出已知发布日期。
  const paths = new Map<string, string | undefined>([
    ['/', undefined], ['/archive/', undefined], ['/timeline/', undefined],
    ['/tags/', undefined], ['/categories/', undefined], ['/tools/', undefined], ['/todo/', undefined]
  ]);
  for (const post of posts) {
    paths.set(`/posts/${encodeURIComponent(post.id)}/`, post.data.date.toISOString());
    for (const tag of post.data.tags) paths.set(`/tags/${encodeURIComponent(tag)}/`, undefined);
    if (post.data.category) {
      const category = `/categories/${encodeURIComponent(post.data.category)}/`;
      paths.set(category, undefined);
      if (post.data.subcategory) paths.set(`${category}${encodeURIComponent(post.data.subcategory)}/`, undefined);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...paths].map(([path, date]) => `  <url><loc>${escapeXml(new URL(path, site).href)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(sitemap, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
