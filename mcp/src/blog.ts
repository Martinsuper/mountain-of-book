import fs from 'node:fs';
import path from 'node:path';
import {
  atomicWrite,
  ensurePostsDir,
  POSTS_DIR,
  resolveSafePostPath,
  slugify,
} from './paths.js';
import { CATEGORIES } from './taxonomy.js';
import {
  checkBodyStyle,
  frontmatterHints,
  type Frontmatter,
  parseFrontmatter,
  stringifyFrontmatter,
  validateFrontmatter,
} from './frontmatter.js';
import { SKELETONS } from './skeletons.js';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  subcategory?: string;
  tags: string[];
  draft: boolean;
}

export interface FullPost extends PostMeta {
  content: string; // 正文（不含 frontmatter）
  raw: string; // 完整文件内容
}

/** 读取 posts 目录下所有文章（含草稿）并按日期从新到旧排序 */
export function listAllPosts(): Array<{ slug: string; post: FullPost }> {
  ensurePostsDir();
  const list = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readPost(f.replace(/\.md$/, '')))
    .filter(Boolean) as Array<{ slug: string; post: FullPost }>;
  list.sort((a, b) => (a.post.date < b.post.date ? 1 : a.post.date > b.post.date ? -1 : 0));
  return list;
}

export function readPost(slug: string): { slug: string; post: FullPost } | null {
  const filePath = resolveSafePostPath(slug);
  if (!filePath || !fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(raw, slug);
  return {
    slug: slug.replace(/\.md$/, ''),
    post: {
      slug: slug.replace(/\.md$/, ''),
      title: frontmatter.title,
      description: frontmatter.description,
      date: frontmatter.date,
      category: frontmatter.category,
      subcategory: frontmatter.subcategory,
      tags: frontmatter.tags,
      draft: frontmatter.draft,
      content: body,
      raw,
    },
  };
}

export function toMeta(p: FullPost): PostMeta {
  const { content, raw, ...meta } = p;
  return meta;
}

/** 列出文章元信息，支持过滤与 keyword 关键词过滤（标题/描述/标签/正文） */
export function listPosts(opts: {
  category?: string;
  tag?: string;
  draft?: boolean;
  keyword?: string;
  limit?: number;
}): PostMeta[] {
  let posts = listAllPosts().map((p) => toMeta(p.post));
  if (opts.category) posts = posts.filter((p) => p.category === opts.category);
  if (opts.tag) posts = posts.filter((p) => p.tags.includes(opts.tag!));
  if (opts.draft !== undefined) posts = posts.filter((p) => p.draft === opts.draft);
  if (opts.keyword) {
    const kw = opts.keyword.toLowerCase();
    posts = posts.filter((p) =>
      [p.title, p.description, p.tags.join(' ')].join(' ').toLowerCase().includes(kw),
    );
  }
  return opts.limit ? posts.slice(0, opts.limit) : posts;
}

export function searchPosts(query: string, limit = 10): Array<{
  slug: string;
  title: string;
  draft: boolean;
  snippet: string;
  matchedIn: string;
}> {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return [];
  const results: Array<{
    slug: string;
    title: string;
    draft: boolean;
    score: number;
    matchedIn: string;
    snippet: string;
  }> = [];

  for (const { slug, post } of listAllPosts()) {
    const haystack: Array<{ field: string; weight: number; text: string }> = [
      { field: 'title', weight: 5, text: post.title.toLowerCase() },
      { field: 'description', weight: 3, text: post.description.toLowerCase() },
      { field: 'tags', weight: 3, text: post.tags.join(' ').toLowerCase() },
      { field: 'category', weight: 2, text: (post.category ?? '').toLowerCase() },
      { field: 'content', weight: 1, text: post.content.toLowerCase() },
    ];
    let score = 0;
    let matchedIn = '';
    for (const kw of keywords) {
      for (const h of haystack) {
        if (h.text.includes(kw)) {
          score += h.weight;
          matchedIn = matchedIn ? `${matchedIn},${h.field}` : h.field;
        }
      }
    }
    if (score === 0) continue;

    // 取含第一个命中词的行做摘要
    const lines = post.content.split('\n');
    const hitLine =
      lines.findIndex((l) => keywords.some((kw) => l.toLowerCase().includes(kw))) ?? -1;
    const snippet =
      hitLine >= 0
        ? lines.slice(hitLine, hitLine + 2).join(' ').slice(0, 200)
        : post.description.slice(0, 200);
    results.push({ slug, title: post.title, draft: post.draft, score, matchedIn, snippet });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...r }) => r);
}

export interface CreatePostArgs {
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  date?: string;
  draft?: boolean;
  slug?: string;
  skeleton?: string;
  content?: string;
}

export function createPost(args: CreatePostArgs): {
  slug: string;
  path: string;
  frontmatterIssues: unknown[];
  styleWarnings: string[];
} {
  ensurePostsDir();

  // slug：显式提供则校验；纯英文标题可从标题推导；含中文标题必须显式提供 slug
  const slug = args.slug
    ? args.slug.toLowerCase()
    : /\p{Script=Han}/u.test(args.title)
      ? null
      : slugify(args.title);
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(
      `无法从标题 "${args.title}" 生成合规 slug（需小写英文/数字+连字符）。请显式传入 slug 参数，例如 slug: "some-topic-guide"`,
    );
  }
  if (!resolveSafePostPath(slug)) {
    throw new Error(`非法 slug: ${slug}`);
  }
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    throw new Error(`文章已存在: ${slug}.md。如需更新请调用 update_post`);
  }

  const fm: Frontmatter = {
    title: args.title,
    description: args.description ?? '',
    date: args.date ?? new Date().toISOString().slice(0, 10),
    tags: args.tags ?? [],
    draft: args.draft ?? true,
  };
  if (args.category) fm.category = args.category;
  if (args.subcategory) fm.subcategory = args.subcategory;

  const issues = validateFrontmatter(fm);
  if (issues.length > 0) {
    throw new Error(`frontmatter 校验失败:\n${issues.map((i) => `- [${i.field}] ${i.message}`).join('\n')}`);
  }

  let body = args.content ?? '';
  if (!body && args.skeleton) {
    const sections = SKELETONS[args.skeleton];
    if (!sections) {
      throw new Error(`未知骨架 "${args.skeleton}"，可选: ${Object.keys(SKELETONS).join(' / ')}`);
    }
    body = sections.join('\n\n---\n\n') + '\n';
  }
  if (!body) {
    body = '<!-- 在此开始写作：正文从 ## 开始，不要重复标题；文末收尾段为「## 参考资料」 -->\n';
  }

  atomicWrite(filePath, stringifyFrontmatter(fm) + body);
  return {
    slug,
    path: path.relative(process.cwd(), filePath),
    frontmatterIssues: [],
    styleWarnings: [...frontmatterHints(fm), ...checkBodyStyle(body)],
  };
}

export interface UpdatePostArgs {
  slug: string;
  content?: string;
  frontmatter?: Partial<Pick<Frontmatter, 'title' | 'description' | 'category' | 'subcategory' | 'tags' | 'draft'>>;
  date?: string;
  overwriteContent?: boolean;
}

export function updatePost(args: UpdatePostArgs): {
  slug: string;
  frontmatterIssues: unknown[];
  styleWarnings: string[];
} {
  const found = readPost(args.slug);
  if (!found) throw new Error(`文章不存在: ${args.slug}`);
  const slug = found.slug;

  const existing = parseFrontmatter(found.post.raw, slug).frontmatter;
  Object.assign(existing, args.frontmatter ?? {});
  if (args.date) existing.date = args.date;

  const issues = validateFrontmatter(existing);
  if (issues.length > 0) {
    throw new Error(`frontmatter 校验失败（未保存）:\n${issues.map((i) => `- [${i.field}] ${i.message}`).join('\n')}`);
  }

  let body = found.post.content;
  if (args.content !== undefined) body = args.content;

  atomicWrite(path.join(POSTS_DIR, `${slug}.md`), stringifyFrontmatter(existing) + body);
  return { slug, frontmatterIssues: [], styleWarnings: [...frontmatterHints(existing), ...checkBodyStyle(body)] };
}

export function setDraft(slug: string, draft: boolean): { slug: string; draft: boolean } {
  updatePost({ slug, frontmatter: { draft } });
  return { slug, draft };
}

export function deletePost(slug: string, confirm: boolean): { slug: string; deleted: boolean } {
  if (!confirm) throw new Error('删除文章需要显式传 confirm: true 以防误删');
  const filePath = resolveSafePostPath(slug);
  if (!filePath || !fs.existsSync(filePath)) throw new Error(`文章不存在: ${slug}`);
  fs.unlinkSync(filePath);
  return { slug: slug.replace(/\.md$/, ''), deleted: true };
}

export function siteStats(): {
  total: number;
  drafts: number;
  byCategory: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  latest: Array<{ slug: string; title: string; date: string }>;
} {
  const posts = listAllPosts().map((p) => toMeta(p.post));
  const byCategory: Record<string, number> = {};
  for (const c of CATEGORIES) byCategory[c] = 0;
  byCategory['未分类'] = 0;
  const tagCount = new Map<string, number>();
  for (const p of posts) {
    const key = p.category || '未分类';
    byCategory[key] = (byCategory[key] ?? 0) + 1;
    for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  return {
    total: posts.length,
    drafts: posts.filter((p) => p.draft).length,
    byCategory,
    topTags: [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count })),
    latest: posts.slice(0, 5).map((p) => ({ slug: p.slug, title: p.title, date: p.date })),
  };
}
