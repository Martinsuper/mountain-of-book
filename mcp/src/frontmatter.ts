import yaml from 'js-yaml';
import { CATEGORIES, CATEGORY_TREE, isSubcategory } from './taxonomy.js';

export interface Frontmatter {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category?: string;
  subcategory?: string;
  tags: string[];
  draft: boolean;
  [key: string]: unknown;
}

/** 解析后的文章 */
export interface ParsedPost {
  frontmatter: Frontmatter;
  body: string;
  raw: string;
}

/**
 * 拆解 Markdown 文件为 frontmatter + 正文。不是合法 frontmatter 时抛错。
 */
export function parseFrontmatter(raw: string, slug: string): ParsedPost {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) {
    throw new Error(`文章 ${slug} 缺少 frontmatter（应以 --- 开头）`);
  }
  let data: Record<string, unknown>;
  try {
    data = yaml.load(m[1]) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`文章 ${slug} frontmatter YAML 解析失败: ${(e as Error).message}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error(`文章 ${slug} frontmatter 为空`);
  }

  // YAML 时间戳会被解析为 Date，统一转成 YYYY-MM-DD 字符串
  if (data.date instanceof Date) {
    data.date = data.date.toISOString().slice(0, 10);
  }

  const fm = data as Frontmatter;
  fm.title = String(fm.title ?? '');
  fm.description = fm.description == null ? '' : String(fm.description);
  fm.date = String(fm.date ?? new Date().toISOString().slice(0, 10));
  fm.tags = fm.tags == null ? [] : (fm.tags as unknown[]).map(String);
  fm.draft = fm.draft === undefined ? false : Boolean(fm.draft);

  return { frontmatter: fm, body: raw.slice(m[0].length), raw };
}

/**
 * 序列化 frontmatter 为 YAML 文本，遵守 CLAUDE.md 的书写格式：
 * title/description/category 用双引号，date 裸日期，tags 双引号流式数组，draft 裸布尔值。
 */
export function stringifyFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ['---'];
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  lines.push(`title: "${esc(fm.title)}"`);
  lines.push(`description: "${esc(fm.description ?? '')}"`);
  lines.push(`date: ${fm.date}`);
  if (fm.category) lines.push(`category: "${esc(fm.category)}"`);
  if (fm.subcategory) lines.push(`subcategory: "${esc(fm.subcategory)}"`);
  const tags = (fm.tags ?? []).map((t) => `"${esc(t)}"`);
  lines.push(tags.length ? `tags: [${tags.join(', ')}]` : 'tags: []');
  lines.push(`draft: ${fm.draft ? 'true' : 'false'}`);
  // 保留调用方传入的额外字段（按原样写入）
  for (const [k, v] of Object.entries(fm)) {
    if (['title', 'description', 'date', 'category', 'subcategory', 'tags', 'draft'].includes(k)) continue;
    lines.push(`${k}: ${yaml.dump(v, { lineWidth: -1 }).trimEnd()}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

export interface FrontmatterIssue {
  field: string;
  message: string;
}

/**
 * 校验 frontmatter 是否违反 CLAUDE.md 的规范。
 * 返回 issues（空数组 = 全部合规）。
 */
export function validateFrontmatter(fm: Frontmatter): FrontmatterIssue[] {
  const issues: FrontmatterIssue[] = [];

  if (!fm.title?.trim()) issues.push({ field: 'title', message: 'title 必填且不能为空' });

  if (fm.description && fm.description.length > 300) {
    issues.push({ field: 'description', message: `description 建议 100-200 字，过长（当前 ${fm.description.length} 字）` });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) {
    issues.push({ field: 'date', message: `date 必须是 YYYY-MM-DD 格式（当前: ${fm.date}）` });
  }

  if (fm.category && !(CATEGORIES as readonly string[]).includes(fm.category)) {
    issues.push({
      field: 'category',
      message: `category "${fm.category}" 不在分类白名单内，合法值: ${CATEGORIES.join(' / ')}`,
    });
  }

  // 与 src/content/config.ts 的 zod schema 保持一致：category 与 subcategory 成对出现，且归属于分类树
  if (fm.category && !fm.subcategory) {
    issues.push({ field: 'subcategory', message: `已设置 category 时必须设置 subcategory，可选值: ${(CATEGORY_TREE[fm.category] ?? []).join(' / ')}` });
  }
  if (!fm.category && fm.subcategory) {
    issues.push({ field: 'subcategory', message: '已设置 subcategory 时必须设置 category' });
  }
  if (fm.category && fm.subcategory && !isSubcategory(fm.category, fm.subcategory)) {
    issues.push({ field: 'subcategory', message: `subcategory "${fm.subcategory}" 不属于分类 "${fm.category}"（合法值: ${(CATEGORY_TREE[fm.category] ?? []).join(' / ')}）` });
  }

  for (const tag of fm.tags) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag)) {
      issues.push({ field: 'tags', message: `标签 "${tag}" 不合规：需小写英文或拼音，多词用连字符（如 sequence-diagram）` });
    }
  }

  if (typeof fm.draft !== 'boolean') issues.push({ field: 'draft', message: 'draft 必须是布尔值 true/false' });

  return issues;
}

/**
 * 建议类规则（CLAUDE.md 中的「建议」，非硬性）。
 * 返回提示列表，不阻塞保存，与 styleWarnings 一起返回给调用方。
 */
export function frontmatterHints(fm: Frontmatter): string[] {
  const hints: string[] = [];
  if (fm.title.length > 50) {
    hints.push(`title 建议不超过 50 字（当前 ${fm.title.length} 字）`);
  }
  if (fm.description && fm.description.length > 300) {
    hints.push(`description 建议 100-200 字（当前 ${fm.description.length} 字）`);
  }
  if (fm.tags.length > 5) {
    hints.push(`建议每篇文章 1-5 个标签（当前 ${fm.tags.length} 个）`);
  }
  return hints;
}

const DECORATIVE_EMOJI = /[\u{2705}\u{274C}\u{26A0}\u{2728}\u{1F4A1}]/u;

/**
 * 校验正文是否符合 CLAUDE.md 风格约束。
 * 返回警告列表（不阻塞保存，供 agent 自查）。
 */
export function checkBodyStyle(body: string): string[] {
  const warnings: string[] = [];

  const headings = body.match(/^#{1,6} .+$/gm) ?? [];
  if (headings.some((h) => h.startsWith('# '))) {
    warnings.push('正文不应使用一级标题（#），文章标题已由 frontmatter 的 title 提供');
  }

  // 收尾段应为「参考资料」
  const lastH2 = headings.filter((h) => h.startsWith('## ')).pop() ?? '';
  if (!lastH2.startsWith('## 参考资料')) {
    warnings.push(`文末收尾段建议为「## 参考资料」（当前: ${lastH2.replace(/^## /, '').trim() || '无'}）`);
  }

  // 装饰性 emoji
  if (DECORATIVE_EMOJI.test(body)) {
    warnings.push('正文含装饰性 emoji（✅❌⚠️✨💡 等），CLAUDE.md §2.12 不推荐');
  }

  // 大段文字
  for (const para of body.split(/\r?\n\r?\n/)) {
    const trimmed = para.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('|') || trimmed.startsWith('>')) continue;
    if (trimmed.split(/\r?\n/).length > 6) {
      warnings.push('存在超过 6 行的纯文字段落，建议用列表/代码块/图表拆分');
      break;
    }
  }

  return [...new Set(warnings)];
}
