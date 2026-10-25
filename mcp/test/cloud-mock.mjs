#!/usr/bin/env node
/**
 * 云端文章工具本地联调：内嵌一个最小 Supabase mock（auth/v1 + PostgREST 语义子集），
 * 通过 stdio JSON-RPC 驱动 dist/index.js 的 cloud_* 工具，全链路验证而无需真实凭据：
 * - Phase A 未配置：cloud_* 报「未配置」，Markdown 工具不受影响
 * - Phase B 密码错误：报「登录失败」
 * - Phase C 正常凭据（URL/anonKey 走 BLOG_ROOT/.env 回退路径）：CRUD/发布/可见范围/授权/删除
 * 用法: node test/cloud-mock.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, '..', 'dist', 'index.js');

const ANON_KEY = 'mock-anon-key';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'correct-horse';
const KNOWN_GRANT_EMAIL = 'known@example.com';

// ---------- 最小 Supabase mock ----------

/** 历史存量 restricted 文章（模拟线上已有的旧数据） */
let articles = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '历史 restricted 文章',
    body: '存量内容',
    status: 'published',
    visibility: 'restricted',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];
const grants = [];
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function matchFilters(row, params) {
  for (const [key, value] of params.entries()) {
    if (['select', 'order', 'limit'].includes(key)) continue;
    const m = /^(eq|neq|ilike)\.(.*)$/s.exec(value);
    if (!m) continue; // or=/in= 等 cloud.ts 未用到，不实现
    const [, op, arg] = m;
    const cell = row[key];
    if (op === 'eq' && String(cell) !== arg) return false;
    if (op === 'neq' && String(cell) === arg) return false;
    if (op === 'ilike' && !String(cell ?? '').toLowerCase().includes(arg.replaceAll('%', '').toLowerCase())) return false;
  }
  return true;
}

function createMockServer() {
  return http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const body = raw ? JSON.parse(raw) : null;
      const url = new URL(req.url, 'http://mock.local');
      const json = (status, payload) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(payload === undefined ? '' : JSON.stringify(payload));
      };

      if (req.headers.apikey !== ANON_KEY) return json(401, { message: 'Invalid API key' });

      // auth: 密码登录
      if (url.pathname === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') !== 'password') return json(400, { message: 'unsupported grant_type' });
        if (body?.email !== ADMIN_EMAIL || body?.password !== ADMIN_PASSWORD) {
          return json(400, { message: 'Invalid login credentials', code: 400, error_code: 'invalid_credentials' });
        }
        return json(200, {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user: { id: '00000000-0000-0000-0000-0000000000aa', email: ADMIN_EMAIL, role: 'authenticated' },
        });
      }

      if (url.pathname === '/rest/v1/rpc/admin_grant_article') {
        if (body?.email !== KNOWN_GRANT_EMAIL) {
          return json(422, { message: 'Invited user not found', code: 'P0002', details: null, hint: null });
        }
        grants.push({ article: body.article, user_id: '00000000-0000-0000-0000-0000000000bb' });
        return json(200, null);
      }

      if (url.pathname === '/rest/v1/articles') {
        const wantsRepresentation = String(req.headers.prefer ?? '').includes('return=representation');
        // PostgREST 语义：Accept 带 vnd.pgrst.object 时返回单对象（single() 不做客户端解包）
        const wantsObject = String(req.headers.accept ?? '').includes('application/vnd.pgrst.object');
        const asRows = (rows) => (wantsObject ? (rows.length === 1 ? rows[0] : null) : rows);
        if (req.method === 'GET') {
          let rows = articles.filter((row) => matchFilters(row, url.searchParams));
          const order = url.searchParams.get('order');
          if (order) {
            const [col, dir] = order.split('.');
            rows = [...rows].sort(
              (a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1),
            );
          }
          const limit = url.searchParams.get('limit');
          if (limit) rows = rows.slice(0, Number(limit));
          return json(200, asRows(rows));
        }
        if (req.method === 'POST') {
          const items = (Array.isArray(body) ? body : [body]).map((it) => ({
            id: uuid(),
            title: '',
            body: '',
            status: 'draft',
            visibility: 'restricted',
            created_at: now(),
            updated_at: now(),
            ...it,
          }));
          articles.push(...items);
          return json(201, wantsRepresentation ? asRows(items) : []);
        }
        if (req.method === 'PATCH') {
          const matched = articles.filter((row) => matchFilters(row, url.searchParams));
          for (const row of matched) Object.assign(row, body, { updated_at: now() });
          return json(200, wantsRepresentation ? asRows(matched) : []);
        }
        if (req.method === 'DELETE') {
          const removed = articles.filter((row) => matchFilters(row, url.searchParams));
          articles = articles.filter((row) => !removed.includes(row));
          return json(200, wantsRepresentation ? asRows(removed) : []);
        }
      }

      json(404, { message: `mock 未实现: ${req.method} ${url.pathname}` });
    });
  });
}

// ---------- stdio MCP 驱动（与 smoke.mjs 相同的协议脚手架） ----------

function spawnServer(env = {}) {
  const child = spawn('node', [SERVER], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
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
  const rpc = (method, params) =>
    new Promise((resolve) => {
      const id = ++msgId;
      pending.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  return {
    child,
    rpc,
    async callTool(name, args) {
      const r = await rpc('tools/call', { name, arguments: args });
      if (r.result?.isError) return { error: r.result.content[0].text };
      try {
        return { data: JSON.parse(r.result?.content?.[0]?.text ?? 'null') };
      } catch {
        return { error: `非 JSON 输出: ${r.result?.content?.[0]?.text?.slice(0, 100)}` };
      }
    },
    kill() {
      child.kill();
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 用例 ----------

const failures = [];
function check(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
  if (!cond) failures.push(name);
}

const mock = createMockServer();
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
const mockPort = mock.address().port;
const CLOUD_ENV = {
  BLOG_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
  BLOG_SUPABASE_ANON_KEY: ANON_KEY,
  BLOG_SUPABASE_ADMIN_EMAIL: ADMIN_EMAIL,
  BLOG_SUPABASE_ADMIN_PASSWORD: ADMIN_PASSWORD,
};

try {
  // Phase A：未配置 → cloud_* 报未配置，Markdown 工具不受影响
  {
    const t = spawnServer();
    await sleep(400);
    await t.rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cloud-mock', version: '1.0.0' } });
    await t.rpc('notifications/initialized', {});
    let r = await t.callTool('list_cloud_posts', {});
    check('A1 未配置时 list_cloud_posts 报未配置', !!r.error && /未配置/.test(r.error));
    r = await t.callTool('list_posts', { limit: 1 });
    check('A2 未配置时 Markdown 工具正常', !r.error && Array.isArray(r.data));
    t.kill();
  }

  // Phase B：密码错误 → 登录失败提示
  {
    const t = spawnServer({ ...CLOUD_ENV, BLOG_SUPABASE_ADMIN_PASSWORD: 'wrong-password' });
    await sleep(400);
    await t.rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cloud-mock', version: '1.0.0' } });
    await t.rpc('notifications/initialized', {});
    const r = await t.callTool('list_cloud_posts', {});
    check('B1 密码错误报登录失败', !!r.error && /登录失败/.test(r.error), (r.error || '').slice(0, 60));
    t.kill();
  }

  // Phase C：正确凭据（URL/anonKey 从 BLOG_ROOT/.env 读取，验证回退解析）
  {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-cloud-mock-'));
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      `PUBLIC_SUPABASE_URL=${CLOUD_ENV.BLOG_SUPABASE_URL}\nPUBLIC_SUPABASE_ANON_KEY="${ANON_KEY}"\n`,
    );
    const t = spawnServer({
      BLOG_ROOT: tmpRoot,
      BLOG_SUPABASE_ADMIN_EMAIL: ADMIN_EMAIL,
      BLOG_SUPABASE_ADMIN_PASSWORD: ADMIN_PASSWORD,
    });
    await sleep(400);
    await t.rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cloud-mock', version: '1.0.0' } });
    await t.rpc('notifications/initialized', {});

    // C1. .env 回退解析成功（存量 restricted 文章可见）
    let r = await t.callTool('list_cloud_posts', {});
    check('C1 .env 回退配置生效', !r.error && Array.isArray(r.data) && r.data.length === 1 && r.data[0].visibility === 'restricted');

    // C2. create 默认草稿 + 登录可见；PlantUML 块给出警告
    r = await t.callTool('create_cloud_post', {
      title: 'cloud mock test',
      body: '正文。\n\n```plantuml\n@startuml\nA -> B\n@enduml\n```\n',
    });
    check('C2 create 默认 draft/authenticated', !r.error && r.data?.status === 'draft' && r.data?.visibility === 'authenticated', r.data?.id);
    const cloudId = r.data?.id;
    check('C3 create 含 PlantUML 警告', (r.data?.styleWarnings ?? []).some((w) => w.includes('PlantUML')));

    // C4. restricted 创建被拒绝
    r = await t.callTool('create_cloud_post', { title: 'nope', visibility: 'restricted' });
    check('C4 create restricted 拒绝', !!r.error);

    // C5. read 读回
    r = await t.callTool('read_cloud_post', { id: cloudId });
    check('C5 read 读回全文', !r.error && r.data?.title === 'cloud mock test' && r.data?.body?.includes('@startuml') && r.data?.readUrl?.includes(cloudId));

    // C6. update 标题 + 正文
    r = await t.callTool('update_cloud_post', { id: cloudId, title: 'cloud mock v2', body: 'xyzzy-smoke 关键词\n新正文\n' });
    check('C6 update 生效', !r.error && r.data?.title === 'cloud mock v2');

    // C7. set_status 发布
    r = await t.callTool('set_cloud_status', { id: cloudId, status: 'published' });
    check('C7 set_status published', !r.error && r.data?.status === 'published');

    // C8. list 状态 + 关键词过滤
    r = await t.callTool('list_cloud_posts', { status: 'published', keyword: 'mock v2' });
    check('C8 list 过滤命中', !r.error && r.data?.some((p) => p.id === cloudId));
    r = await t.callTool('list_cloud_posts', { status: 'draft' });
    check('C8 list draft 不含已发布', !r.error && !r.data?.some((p) => p.id === cloudId));

    // C9. search 正文命中
    r = await t.callTool('search_cloud_posts', { query: 'xyzzy-smoke' });
    check('C9 search 正文命中', !r.error && r.data?.some((h) => h.id === cloudId && h.matchedIn?.includes('body')));

    // C10. visibility：public 可设；restricted 拒绝
    r = await t.callTool('set_cloud_visibility', { id: cloudId, visibility: 'public' });
    check('C10 visibility public', !r.error && r.data?.visibility === 'public');
    r = await t.callTool('set_cloud_visibility', { id: cloudId, visibility: 'restricted' });
    check('C10 visibility restricted 拒绝', !!r.error && /历史/.test(r.error));

    // C11. 非法 UUID
    r = await t.callTool('read_cloud_post', { id: 'not-a-uuid' });
    check('C11 非法 UUID 拒绝', !!r.error);

    // C12. grant：未注册邮箱报错；存量 restricted 文章授权成功
    r = await t.callTool('grant_cloud_post', { id: cloudId, email: 'nobody-unknown@example.com' });
    check('C12 grant 未注册邮箱报错', !!r.error && /未找到/.test(r.error));
    const legacyId = '11111111-1111-1111-1111-111111111111';
    r = await t.callTool('grant_cloud_post', { id: legacyId, email: KNOWN_GRANT_EMAIL });
    check('C12 grant 存量 restricted 成功', !r.error && r.data?.granted === true);
    check('C12 mock 记录授权', grants.length === 1 && grants[0].article === legacyId);

    // C13. delete：需 confirm；删除后不可读
    r = await t.callTool('delete_cloud_post', { id: cloudId });
    check('C13 delete 需 confirm', !!r.error);
    r = await t.callTool('delete_cloud_post', { id: cloudId, confirm: true });
    check('C13 delete 成功', !r.error && r.data?.deleted === true);
    r = await t.callTool('read_cloud_post', { id: cloudId });
    check('C13 删除后不可读', !!r.error && /不存在/.test(r.error));

    t.kill();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
} finally {
  mock.close();
}

console.log(failures.length ? `\n${failures.length} 项失败: ${failures.join('; ')}` : '\n全部通过');
process.exit(failures.length ? 1 : 0);
