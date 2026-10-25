// 待办设备 API：Worker 是唯一的信任边界。
// 设备持长效 token（bk_ 前缀），Worker 校验后以 service_role 身份调用 PostgREST——
// service_role 绕过 RLS，因此每一条 user_todos 查询都必须显式带 user_id 过滤。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^bk_[A-Za-z0-9_-]{43}$/;
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
// 每分钟每设备的软限制（每 PoP 尽力而为）：防固件 bug 疯狂轮询，不是恶意攻击防线。
const RATE_LIMITS = { GET: 60, PATCH: 30 };

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});
const fail = (status, code, message, extra = {}) => json({ ok: false, error: { code, message } }, status, extra);

// 字段名与前端 TodoItem 的 camelCase 保持一致，设备端与网页端心智统一。
const toTodo = row => ({
  id: row.id,
  title: row.title,
  description: row.description ?? null,
  category: row.category ?? null,
  quadrant: row.quadrant,
  priority: row.priority,
  dueDate: row.due_date ?? null,
  completed: row.completed,
  completedAt: row.completed_at ?? null,
  updatedAt: row.updated_at,
});

// 未完成在前 → quadrant 1→4 → priority high→medium→low → dueDate 升序、空值在后。
function compareTodos(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.quadrant !== b.quadrant) return a.quadrant - b.quadrant;
  const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (byPriority) return byPriority;
  const dueA = Date.parse(a.due_date), dueB = Date.parse(b.due_date);
  if (Number.isNaN(dueA) && Number.isNaN(dueB)) return 0;
  if (Number.isNaN(dueA)) return 1;
  if (Number.isNaN(dueB)) return -1;
  return dueA - dueB;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function postgrest(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...init.headers,
    },
  });
}

// Cache API 只保证单 PoP 一致，跨 PoP 计数有偏差；作为软限制可接受。
async function consumeRateSlot(url, method, tokenHash, maxPerMinute) {
  const bucket = Math.floor(Date.now() / 60000);
  const key = new Request(new URL(`/_rl/${method}/${tokenHash}/${bucket}`, url.origin));
  const cached = await caches.default.match(key).catch(() => undefined);
  const current = Number(cached ? await cached.text() : '0');
  if (Number.isNaN(current)) return true;
  if (current >= maxPerMinute) return false;
  await caches.default.put(key, new Response(String(current + 1), { headers: { 'Cache-Control': 'public, max-age=120' } }));
  return true;
}

// GET /api/todos?status=active|completed|all（默认 active）&limit=1..200（默认 50）
async function listTodos(env, url, userId) {
  const status = url.searchParams.get('status') ?? 'active';
  if (!['active', 'completed', 'all'].includes(status)) return fail(400, 'bad_request', 'status 仅支持 active、completed、all。');
  const rawLimit = url.searchParams.get('limit') ?? '50';
  if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 200) return fail(400, 'bad_request', 'limit 需为 1-200 的整数。');

  const filters = [`user_id=eq.${userId}`];
  if (status !== 'all') filters.push(`completed=eq.${status === 'completed'}`);
  filters.push('limit=1000'); // 个人数据量小：先取回再在 Worker 内排序，上限只是防异常数据的保险。
  const res = await postgrest(env, `user_todos?select=id,title,description,category,quadrant,priority,due_date,completed,completed_at,updated_at&${filters.join('&')}`);
  if (!res.ok) return fail(500, 'server_error', '读取待办失败，请稍后重试。');
  const todos = (await res.json()).sort(compareTodos).slice(0, Number(rawLimit)).map(toTodo);
  return json({ ok: true, serverTime: new Date().toISOString(), count: todos.length, todos });
}

// PATCH /api/todos/{id}：可写字段白名单只有 completed；updated_at / completed_at 由服务端维护。
async function toggleTodo(env, url, userId, request) {
  const id = url.pathname.slice('/api/todos/'.length);
  if (!UUID_RE.test(id)) return fail(400, 'bad_request', '待办 id 需为 UUID。');
  let body;
  try { body = await request.json(); } catch { return fail(400, 'bad_request', '请求体需为合法 JSON。'); }
  if (typeof body?.completed !== 'boolean') return fail(400, 'bad_request', '请求体需为 {"completed": true|false}，其余字段将被忽略。');

  const now = new Date().toISOString();
  const res = await postgrest(env, `user_todos?id=eq.${id}&user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ completed: body.completed, completed_at: body.completed ? now : null, updated_at: now }),
  });
  if (!res.ok) return fail(500, 'server_error', '更新待办失败，请稍后重试。');
  const [row] = await res.json();
  // 不区分「id 属于别人」与「已被删除」，统一 404，避免探测。
  if (!row) return fail(404, 'not_found', '待办不存在。');
  return json({ ok: true, todo: toTodo(row) });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) return fail(500, 'server_error', '服务端未配置 Supabase 密钥。');
      if (request.method === 'OPTIONS') return fail(405, 'method_not_allowed', '不提供 CORS 预检，设备直连即可。');

      // 认证：Bearer 设备 token → SHA-256 → device_tokens（过滤 revoked_at is null）。
      const header = request.headers.get('Authorization') || '';
      const bearer = /^Bearer\s+(.+)$/i.exec(header)?.[1];
      if (!bearer) return fail(401, 'missing_token', '缺少 Authorization: Bearer 设备令牌。');
      if (!TOKEN_RE.test(bearer)) return fail(401, 'invalid_token', '设备令牌格式无效。');
      const tokenHash = await sha256Hex(bearer);

      const limit = RATE_LIMITS[request.method];
      if (limit && !(await consumeRateSlot(url, request.method, tokenHash, limit))) {
        return fail(429, 'rate_limited', '请求过于频繁，请稍后再试。', { 'Retry-After': '60' });
      }

      const lookup = await postgrest(env, `device_tokens?select=id,user_id&token_hash=eq.${tokenHash}&revoked_at=is.null`);
      if (!lookup.ok) return fail(500, 'server_error', '设备令牌校验失败，请稍后重试。');
      const [token] = await lookup.json();
      if (!token) return fail(401, 'invalid_token', '设备令牌无效或已吊销。');

      // last_used_at 异步更新，不阻塞响应。
      ctx.waitUntil(postgrest(env, `device_tokens?id=eq.${token.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ last_used_at: new Date().toISOString() }),
      }).then(r => r.body?.cancel()).catch(() => {}));

      if (request.method === 'GET' && url.pathname === '/api/todos') return listTodos(env, url, token.user_id);
      if (request.method === 'PATCH' && url.pathname.startsWith('/api/todos/')) return toggleTodo(env, url, token.user_id, request);
      return fail(404, 'not_found', '接口不存在。');
    } catch {
      return fail(500, 'server_error', '服务暂时不可用，请稍后重试。');
    }
  },
};
