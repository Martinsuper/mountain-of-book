import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 博客项目根目录。
 * 优先取环境变量 BLOG_ROOT；否则用 mcp/ 的上一级目录（即本仓库根）。
 */
export const BLOG_ROOT = process.env.BLOG_ROOT
  ? path.resolve(process.env.BLOG_ROOT)
  : path.resolve(__dirname, '..', '..');

export const POSTS_DIR = path.join(BLOG_ROOT, 'src', 'content', 'posts');
export const VALIDATE_SCRIPT = path.join(BLOG_ROOT, 'scripts', 'validate-plantuml.sh');

/**
 * 合法的文章骨架（CLAUDE.md §2.3）
 */
export const SKELETON_NAMES = [
  '项目评介型',
  '操作教程型',
  '问题排查型',
  '原理解析型',
  '速查清单型',
] as const;

export function ensurePostsDir(): void {
  if (!fs.existsSync(POSTS_DIR)) {
    throw new Error(`posts 目录不存在: ${POSTS_DIR}，请确认 BLOG_ROOT 指向博客项目根目录`);
  }
}

/**
 * 把 slug 解析为 posts 目录下的安全路径，防止路径遍历（../、绝对路径等）。
 * 非法 slug 返回 null。逻辑与 astro.config.mjs 的 resolveSafePostPath 保持一致。
 */
export function resolveSafePostPath(slug: string): string | null {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  const base = slug.replace(/\.md$/, '');
  if (base.includes('/') || base.includes('\\') || base.includes('..')) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(base)) return null;
  const filePath = path.join(POSTS_DIR, `${base}.md`);
  if (!filePath.startsWith(POSTS_DIR + path.sep)) return null;
  return filePath;
}

/**
 * 原子写文件：先写同目录临时文件，再 rename 覆盖。
 */
export function atomicWrite(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/**
 * 从标题生成合规 slug：小写英文/数字 + 连字符。
 * 中文标题无法转换时返回 null，由调用方要求提供显式 slug。
 */
export function slugify(title: string): string | null {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}
