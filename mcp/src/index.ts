#!/usr/bin/env node
/**
 * book-blog MCP server (stdio)
 * 让任意 agent 直接读写/检索「书山有路」博客的文章。
 *
 * 根目录解析：环境变量 BLOG_ROOT（默认本仓库根）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  BLOG_ROOT,
  SKELETON_NAMES,
} from './paths.js';
import { CATEGORIES, CATEGORY_TREE } from './taxonomy.js';
import {
  createPost,
  deletePost,
  listPosts,
  readPost,
  setDraft,
  searchPosts,
  siteStats,
  updatePost,
} from './blog.js';
import { SKELETONS, styleGuideText } from './skeletons.js';
import { checkMarkdownFiles } from './plantuml.js';

const server = new McpServer(
  { name: 'book-blog', version: '1.0.0' },
  { instructions: '「书山有路」博客（Astro 静态站）的文章读写 MCP。写新文章请先调用 get_style_guide 了解规范；包含 PlantUML 代码块的文章写完后必须调用 check_plantuml 验证。文章保存到本地仓库，发布需要由调用方自行 git commit + push 到 main 触发部署。' },
);

/** 统一错误处理：把异常转为工具错误文本 */
async function safeCall<T>(fn: () => T): Promise<{ content: Array<{ type: 'text'; text: string; }>; isError?: boolean }> {
  try {
    const result = await fn();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: (e as Error).message }],
    };
  }
}

server.registerTool(
  'list_posts',
  {
    title: '列出文章',
    description: '列出博客文章元信息（含草稿），支持按分类/标签/草稿状态/关键词过滤，按日期从新到旧排序',
    inputSchema: {
      category: z.string().optional().describe(`按分类过滤，合法值: ${CATEGORIES.join(' / ')}`),
      tag: z.string().optional().describe('按标签过滤'),
      draft: z.boolean().optional().describe('true=只看草稿，false=只看已发布，不传=全部'),
      keyword: z.string().optional().describe('关键词，匹配标题/描述/标签'),
      limit: z.number().int().positive().max(100).optional().describe('最多返回条数，默认全部'),
    },
  },
  async (args) => safeCall(() => listPosts(args)),
);

server.registerTool(
  'search_posts',
  {
    title: '搜索文章',
    description: '全文检索博客文章（标题权重最高，其次描述/标签，再次正文），返回分数与摘要片段',
    inputSchema: {
      query: z.string().min(1).describe('检索词，可含多个空格分隔的关键词（AND 语义计分）'),
      limit: z.number().int().positive().max(20).optional().describe('最多返回条数，默认 10'),
    },
  },
  async (args) => safeCall(() => searchPosts(args.query, args.limit)),
);

server.registerTool(
  'read_post',
  {
    title: '读取文章',
    description: '读取一篇文章：返回 frontmatter 元信息、正文和完整原始内容',
    inputSchema: {
      slug: z.string().min(1).describe('文章 slug（文件名去掉 .md，如 maven-guide）'),
    },
  },
  async (args) =>
    safeCall(() => {
      const found = readPost(args.slug);
      if (!found) throw new Error(`文章不存在: ${args.slug}`);
      return found;
    }),
);

server.registerTool(
  'create_post',
  {
    title: '创建文章',
    description:
      '创建新文章（自动校验并写入合规 frontmatter）。中文标题必须显式传合规 slug（小写英文/数字+连字符）。' +
      `可选 skeleton 生成文章骨架，可选值: ${SKELETON_NAMES.join(' / ')}。新文章默认 draft: true。` +
      '返回 styleWarnings 供自查写作规范。',
    inputSchema: {
      title: z.string().min(1).max(50).describe('文章标题，不超过 50 字'),
      description: z.string().optional().describe('描述/摘要，建议 100-200 字，用于 SEO'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('日期 YYYY-MM-DD，默认今天'),
      category: z.string().optional().describe(`分类，合法值: ${CATEGORIES.join(' / ')}；设置后 subcategory 必填`),
      subcategory: z
        .string()
        .optional()
        .describe(
          `子分类，设置 category 时必填。各分类的合法值: ${Object.entries(CATEGORY_TREE).map(([c, subs]) => `${c}（${subs.join('、')}）`).join('；')}`,
        ),
      tags: z.array(z.string()).optional().describe('标签，小写英文/拼音，多词用连字符，建议 1-5 个'),
      draft: z.boolean().optional().describe('默认 true（草稿）'),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional().describe('文件名 slug；中文标题必填'),
      skeleton: z.string().optional().describe(`文章骨架，可选值: ${SKELETON_NAMES.join(' / ')}`),
      content: z.string().optional().describe('正文 Markdown（与 skeleton 二选一或叠加）'),
    },
  },
  (args) => safeCall(() => createPost(args)),
);

server.registerTool(
  'update_post',
  {
    title: '更新文章',
    description:
      '更新文章：content 为正文全文替换（不传则保留原正文）；frontmatter 为局部字段合并；date 直接覆盖日期。校验失败时不保存。',
    inputSchema: {
      slug: z.string().min(1).describe('文章 slug'),
      content: z.string().optional().describe('新正文（全文替换，不含 frontmatter）'),
      frontmatter: z
        .object({
          title: z.string().max(50).optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          subcategory: z.string().optional(),
          tags: z.array(z.string()).optional(),
          draft: z.boolean().optional(),
        })
        .optional()
        .describe('局部更新 frontmatter 字段，传入的合并进现有值'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('覆盖日期 YYYY-MM-DD'),
    },
  },
  (args) => safeCall(() => updatePost(args)),
);

server.registerTool(
  'set_draft',
  {
    title: '切换草稿状态',
    description: '设置文章 draft 字段：true=转为草稿（下线），false=发布（推送到 main 后自动部署）',
    inputSchema: {
      slug: z.string().min(1).describe('文章 slug'),
      draft: z.boolean().describe('true=转为草稿，false=发布'),
    },
  },
  (args) => safeCall(() => setDraft(args.slug, args.draft)),
);

server.registerTool(
  'delete_post',
  {
    title: '删除文章',
    description: '永久删除一篇文章的 .md 文件，必须显式传 confirm: true',
    inputSchema: {
      slug: z.string().min(1).describe('文章 slug'),
      confirm: z.boolean().describe('必须为 true 才执行删除'),
    },
  },
  (args) => safeCall(() => deletePost(args.slug, args.confirm)),
);

server.registerTool(
  'check_plantuml',
  {
    title: '校验 PlantUML',
    description: '用本地 PlantUML JAR 校验文章（或全部文章）中的 PlantUML 代码块语法。无 PlantUML 块视为通过',
    inputSchema: {
      slug: z.string().optional().describe('只校验这一篇文章；不传则校验全部'),
    },
  },
  async (args) =>
    safeCall(async () => {
      const { listAllPosts } = await import('./blog.js');
      const targets = listAllPosts().filter((p) => !args?.slug || p.slug === args.slug || `${p.slug}.md` === args.slug);
      if (args?.slug && targets.length === 0) throw new Error(`文章不存在: ${args.slug}`);
      const results = await checkMarkdownFiles(targets.map((t) => ({ slug: t.slug, content: t.post.raw })));
      return {
        root: BLOG_ROOT,
        checked: results.length,
        allOk: results.every((r) => r.ok),
        results: results.filter((r) => r.blockCount > 0 || !r.ok),
      };
    }),
);

server.registerTool(
  'get_style_guide',
  {
    title: '获取写作规范',
    description:
      `返回博客写作规范速查：frontmatter 格式、分类白名单、命名规则、4 条结构原则、5 类文章骨架、语气红线、配图规范。写新文章前后都应对照。骨架可选值: ${SKELETON_NAMES.join(' / ')}`,
    inputSchema: {},
  },
  () =>
    safeCall(() => ({
      categories: CATEGORIES,
      categoryTree: CATEGORY_TREE,
      skeletons: SKELETONS,
      guide: styleGuideText(),
    })),
);

server.registerTool(
  'site_stats',
  {
    title: '站点统计',
    description: '博客统计：总数、草稿数、分类分布、热门标签、最近文章',
    inputSchema: {},
  },
  () => safeCall(() => siteStats()),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 模式下不能随意往 stdout 打日志，仅向 stderr 提示
  console.error(`[book-blog-mcp] started. BLOG_ROOT=${BLOG_ROOT}`);
}

main().catch((e) => {
  console.error('[book-blog-mcp] fatal:', e);
  process.exit(1);
});
