#!/usr/bin/env node
/**
 * book-blog-mcp 冒烟测试：通过 stdio JSON-RPC 调用所有工具
 * 用法: node test/smoke.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, '..', 'dist', 'index.js');

const child = spawn('node', [SERVER], {
  env: { ...process.env },
  stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

let msgId = 0;
const pending = new Map();
let buffer = '';

child.stdout.on('data', (d) => {
  buffer += d.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function rpc(method, params) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(500);

const failures = [];
function check(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
  if (!cond) failures.push(name);
}

// 1. initialize
const init = await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'smoke-test', version: '1.0.0' },
});
check('initialize', init.result?.serverInfo?.name === 'book-blog');

await rpc('notifications/initialized', {});
const tools = await rpc('tools/list', {});
const names = tools.result?.tools?.map((t) => t.name) ?? [];
check('tools/list 有 19 个工具', names.length === 19, names.join(', '));
check(
  'tools/list 含云端工具族',
  ['list_cloud_posts', 'create_cloud_post', 'update_cloud_post', 'set_cloud_status', 'set_cloud_visibility', 'delete_cloud_post', 'grant_cloud_post', 'read_cloud_post', 'search_cloud_posts'].every((n) => names.includes(n)),
);

async function callTool(name, args) {
  const r = await rpc('tools/call', { name, arguments: args });
  if (r.result?.isError) return { error: r.result.content[0].text };
  try {
    return { data: JSON.parse(r.result?.content?.[0]?.text ?? 'null') };
  } catch {
    return { error: `非 JSON 输出: ${r.result?.content?.[0]?.text?.slice(0, 100)}` };
  }
}

// 2. list_posts
let r = await callTool('list_posts', { limit: 3 });
check('list_posts', Array.isArray(r.data) && r.data.length === 3 && r.data[0].slug && 'draft' in r.data[0]);

// 3. list_posts 过滤草稿
r = await callTool('list_posts', { draft: true });
check('list_posts draft 过滤', Array.isArray(r.data) && r.data.every((p) => p.draft === true), `${r.data.length} 篇草稿`);

// 4. search_posts
r = await callTool('search_posts', { query: 'maven', limit: 5 });
check('search_posts', Array.isArray(r.data) && r.data.length > 0 && r.data[0].matchedIn, r.data?.[0]?.slug);

// 5. read_post 不存在的文章 → 报错
r = await callTool('read_post', { slug: 'definitely-not-exist' });
check('read_post 缺失文章报错', !!r.error);

// 6. 非法 slug 报错（路径遍历）
r = await callTool('read_post', { slug: '../../etc/passwd' });
check('read_post 路径遍历拦截', !!r.error, (r.error || '').slice(0, 50));

// 7. create_post：中文标题不带 slug → 报错
r = await callTool('create_post', { title: '测试文章：MCP 冒烟测试' });
check('create_post 中文标题要求 slug', !!r.error, (r.error || '').slice(0, 40));

// 8. create_post：非法分类 → 报错
r = await callTool('create_post', { title: 'smoke test post', slug: 'smoke-test-post', category: '开发工具' });
check('create_post 非法分类拒绝', !!r.error, (r.error || '').includes('白名单') ? '白名单提示' : '');

// 9. create_post：合规创建（带骨架）
r = await callTool('create_post', {
  title: 'MCP smoke test',
  slug: 'mcp-smoke-test',
  description: 'MCP 冒烟测试文章，创建后立即删除',
  category: 'AI 工程',
  subcategory: 'Skills 与工作流',
  tags: ['mcp', 'test'],
  skeleton: '操作教程型',
});
check('create_post 创建成功', !!r.data?.path, r.data?.slug);

// 10. read_post 读回
r = await callTool('read_post', { slug: 'mcp-smoke-test' });
check('read_post 读回创建的文章', r.data?.post?.draft === true && r.data?.post?.content?.includes('## 目标'));

// 11. update_post 更新正文 + frontmatter
r = await callTool('update_post', {
  slug: 'mcp-smoke-test',
  frontmatter: { description: '更新后的描述' },
  content: '```plantuml\n@startuml\nAlice -> Bob: test\n@enduml\n```\n\nupdate body\n',
});
check('update_post 更新成功', !r.error && !!r.data?.slug, (r.error || '').slice(0, 60));

// 12. set_draft 发布
r = await callTool('set_draft', { slug: 'mcp-smoke-test', draft: false });
check('set_draft false', !r.error && r.data?.draft === false);

// 13. check_plantuml 单篇
r = await callTool('check_plantuml', { slug: 'mcp-smoke-test' });
check('check_plantuml 语法正确通过', !r.error && r.data?.allOk === true && r.data?.results?.[0]?.blockCount === 1);

// 14. check_plantuml 语法错误 → 报 fail
await callTool('update_post', {
  slug: 'mcp-smoke-test',
  content: '```plantuml\n@startuml\nclass Foo {\n@enduml\n```\n',
});
r = await callTool('check_plantuml', { slug: 'mcp-smoke-test' });
check('check_plantuml 语法错误能发现', !r.error && r.data?.allOk === false, (r.data?.results?.[0]?.blocks?.[0]?.error || '').split('\n')[0].slice(0, 60));

// 15. delete_post：不传 confirm 拒绝
r = await callTool('delete_post', { slug: 'mcp-smoke-test' });
check('delete_post 需 confirm', !!r.error);

// 16. delete_post：删除清理
r = await callTool('delete_post', { slug: 'mcp-smoke-test', confirm: true });
check('delete_post 删除成功', !r.error && r.data?.deleted === true);

// 17. site_stats
r = await callTool('site_stats', {});
check(
  'site_stats',
  !r.error && r.data?.total > 40 && r.data?.byCategory && Array.isArray(r.data?.topTags),
  `共 ${r.data?.total} 篇 / 草稿 ${r.data?.drafts} 篇`,
);

// 18. get_style_guide
r = await callTool('get_style_guide', {});
check(
  'get_style_guide',
  !r.error && (r.data?.guide || '').includes('四条结构原则') && r.data?.categories?.length === 4 && r.data?.categoryTree,
);

// 19. taxonomy 与代码单一事实来源同步检测（防止 src/lib/categories.ts 改动后 MCP 静默漂移）
{
  const { readFileSync } = await import('node:fs');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const dist = createRequire(import.meta.url)('../dist/taxonomy.js');
  const src = readFileSync(new URL('../../src/lib/categories.ts', import.meta.url), 'utf-8');

  const m = /export const CATEGORIES = \[([^\]]+)\]/.exec(src);
  const cats = m[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  const treeSrc = {};
  for (const [, cat, subs] of src.matchAll(/'([^']+)': \[((?:'[^']+',?\s*)+)\]/g)) {
    treeSrc[cat] = subs.match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  }
  check(
    'taxonomy 同步（categories.ts 是单一事实来源）',
    JSON.stringify(cats) === JSON.stringify(dist.CATEGORIES) &&
      JSON.stringify(treeSrc) === JSON.stringify(dist.CATEGORY_TREE),
    `${cats.join('/')}，${Object.keys(treeSrc).length} 棵子树`,
  );
}

// 20. 全量 frontmatter 校验：现有 47 篇文章应全部通过 MCP 校验（防线防误伤）
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const { createRequire } = await import('node:module');
  const { parseFrontmatter, validateFrontmatter } = createRequire(import.meta.url)('../dist/frontmatter.js');
  const postsDir = new URL('../../src/content/posts/', import.meta.url);
  const files = readdirSync(postsDir).filter((f) => f.endsWith('.md'));
  const offenders = [];
  for (const f of files) {
    const issues = validateFrontmatter(parseFrontmatter(readFileSync(new URL(f, postsDir), 'utf-8'), f).frontmatter);
    if (issues.length > 0) offenders.push(`${f}: ${issues[0].message}`);
  }
  check('全部现有文章通过 frontmatter 校验', offenders.length === 0, offenders.length ? offenders[0] : `${files.length} 篇`);
}

// 22. 云端文章工具（Supabase）：探测到凭据才执行完整用例，未配置则跳过
{
  const probe = await callTool('list_cloud_posts', {});
  if (probe.error && /未配置/.test(probe.error)) {
    console.log('SKIP - 云端文章测试（未配置 BLOG_SUPABASE_* 站长凭据，不影响 Markdown 工具）');
  } else if (probe.error) {
    check('云端文章测试', false, probe.error.slice(0, 120));
  } else {
    const cloudIds = [];
    try {
      // c1. create_cloud_post：restricted 被拒绝（zod enum 校验）
      r = await callTool('create_cloud_post', {
        title: 'MCP cloud smoke',
        visibility: 'restricted',
      });
      check('create_cloud_post restricted 拒绝', !!r.error);

      // c2. 默认创建：草稿 + 登录可见；含 PlantUML 块应返回图表警告
      r = await callTool('create_cloud_post', {
        title: 'MCP cloud smoke',
        body: '正文第一段。\n\n```plantuml\n@startuml\nA -> B\n@enduml\n```\n',
      });
      check(
        'create_cloud_post 默认草稿+登录可见',
        !r.error && r.data?.id && r.data?.status === 'draft' && r.data?.visibility === 'authenticated',
        r.data?.id,
      );
      const cloudId = r.data?.id;
      cloudIds.push(cloudId);
      check('create_cloud_post 图表警告', (r.data?.styleWarnings ?? []).some((w) => w.includes('PlantUML')));

      // c3. read_cloud_post 读回
      r = await callTool('read_cloud_post', { id: cloudId });
      check('read_cloud_post 读回', !r.error && r.data?.title === 'MCP cloud smoke' && r.data?.body?.includes('@startuml') && r.data?.readUrl?.includes(cloudId));

      // c4. update_cloud_post 更新标题和正文
      r = await callTool('update_cloud_post', {
        id: cloudId,
        title: 'MCP cloud smoke v2',
        body: '云端冒烟关键词 xyzzy-smoke\n更新后的正文\n',
      });
      check('update_cloud_post 更新', !r.error && r.data?.title === 'MCP cloud smoke v2');

      // c5. set_cloud_status 发布
      r = await callTool('set_cloud_status', { id: cloudId, status: 'published' });
      check('set_cloud_status 发布', !r.error && r.data?.status === 'published');

      // c6. list_cloud_posts 状态过滤 + 标题关键词
      r = await callTool('list_cloud_posts', { status: 'published', keyword: 'cloud smoke' });
      check('list_cloud_posts 过滤', !r.error && Array.isArray(r.data) && r.data.some((p) => p.id === cloudId));

      // c7. search_cloud_posts 正文命中
      r = await callTool('search_cloud_posts', { query: 'xyzzy-smoke' });
      check('search_cloud_posts 命中', !r.error && Array.isArray(r.data) && r.data.some((h) => h.id === cloudId && h.matchedIn?.includes('body')));

      // c8. set_cloud_visibility 公开
      r = await callTool('set_cloud_visibility', { id: cloudId, visibility: 'public' });
      check('set_cloud_visibility public', !r.error && r.data?.visibility === 'public');

      // c9. set_cloud_visibility restricted 拒绝（历史存量专用）
      r = await callTool('set_cloud_visibility', { id: cloudId, visibility: 'restricted' });
      check('set_cloud_visibility restricted 拒绝', !!r.error && /历史/.test(r.error));

      // c10. 非法 UUID
      r = await callTool('read_cloud_post', { id: 'not-a-uuid' });
      check('read_cloud_post 非法 UUID 拒绝', !!r.error);

      // c11. grant_cloud_post：未注册邮箱 → 可读错误
      r = await callTool('grant_cloud_post', { id: cloudId, email: 'nobody-unknown@example.com' });
      check('grant_cloud_post 未注册邮箱报错', !!r.error && /未找到/.test(r.error));

      // c12. delete：不传 confirm 拒绝
      r = await callTool('delete_cloud_post', { id: cloudId });
      check('delete_cloud_post 需 confirm', !!r.error);

      // c13. delete 后读取报错
      r = await callTool('delete_cloud_post', { id: cloudId, confirm: true });
      check('delete_cloud_post 删除成功', !r.error && r.data?.deleted === true);
      cloudIds.length = 0;
      r = await callTool('read_cloud_post', { id: cloudId });
      check('delete_cloud_post 删除后不可读', !!r.error && /不存在/.test(r.error));
    } finally {
      for (const id of cloudIds) await callTool('delete_cloud_post', { id, confirm: true });
    }
  }
}

child.kill();
console.log(failures.length ? `\n${failures.length} 项失败: ${failures.join('; ')}` : '\n全部通过');
process.exit(failures.length ? 1 : 0);
