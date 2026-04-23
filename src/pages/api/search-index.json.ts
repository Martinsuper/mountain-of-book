import { getCollection } from 'astro:content';
import { sortPostsByCreateTime } from '../../lib/post-utils';

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  sortPostsByCreateTime(posts);

  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description || '',
    slug: post.id,
    tags: post.data.tags || [],
    date: post.data.date.toISOString()
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}