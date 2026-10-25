import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const ENV = { SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' };
const TOKEN = `bk_${'A'.repeat(43)}`;
const UUID_OK = '3f2c0a58-1111-4222-8333-444444444444';

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
const TOKEN_HASH = await sha256Hex(TOKEN);

// 与 worker.mjs 同款的排序期望：未完成 → quadrant → priority → dueDate 升序、空值在后。
const rows = {
  t1: { id: 't1', title: '已完成', description: null, category: null, quadrant: 1, priority: 'high', due_date: null, completed: true, completed_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' },
  t2: { id: 't2', title: 'Q2低', description: null, category: null, quadrant: 2, priority: 'low', due_date: '2026-10-20T10:00:00Z', completed: false, completed_at: null, updated_at: '2026-10-02T00:00:00Z' },
  t3: { id: 't3', title: 'Q1高有期限', description: null, category: null, quadrant: 1, priority: 'high', due_date: '2026-10-25T10:00:00Z', completed: false, completed_at: null, updated_at: '2026-10-03T00:00:00Z' },
  t4: { id: 't4', title: 'Q1高无限期', description: null, category: null, quadrant: 1, priority: 'high', due_date: null, completed: false, completed_at: null, updated_at: '2026-10-04T00:00:00Z' },
  t5: { id: 't5', title: 'Q1中', description: null, category: null, quadrant: 1, priority: 'medium', due_date: '2026-10-19T10:00:00Z', completed: false, completed_at: null, updated_at: '2026-10-05T00:00:00Z' },
  t6: { id: 't6', title: 'Q4高', description: null, category: null, quadrant: 4, priority: 'high', due_date: '2026-10-21T10:00:00Z', completed: false, completed_at: null, updated_at: '2026-10-06T00:00:00Z' },
};

const pending = [];
const ctx = { waitUntil: p => pending.push(p) };
const drain = async () => { const all = pending.splice(0); await Promise.allSettled(all); };

let deviceTokenRows = null;   // null → 有效令牌记录；数组 → 查询结果（[] 即未知或已吊销）
let todoRows = [];
let patchResultRows = [];     // user_todos PATCH 的 representation；[] 即目标不存在或不属于该用户
let lastUsedPatch = null;     // Worker 更新 last_used_at 的调用
let lastTodoPatch = null;     // Worker 翻转完成状态的调用

async function mockFetch(url, options = {}) {
  const u = String(url);
  const headers = new Headers(options.headers);
  assert.equal(headers.get('apikey'), ENV.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(headers.get('Authorization'), `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`);
  if (u === `${ENV.SUPABASE_URL}/rest/v1/device_tokens?select=id,user_id&token_hash=eq.${TOKEN_HASH}&revoked_at=is.null`) {
    return Response.json(deviceTokenRows ?? [{ id: 'tok-1', user_id: 'user-1' }]);
  }
  if (u.startsWith(`${ENV.SUPABASE_URL}/rest/v1/device_tokens?id=eq.`)) {
    lastUsedPatch = { url: u, headers, body: JSON.parse(options.body) };
    return new Response(null, { status: 204 });
  }
  if (u.startsWith(`${ENV.SUPABASE_URL}/rest/v1/user_todos?`)) {
    // 安全红线：service_role 绕过 RLS，任何 user_todos 调用都必须显式带 user_id 过滤。
    assert.ok(u.includes('user_id=eq.user-1'), `user_todos 调用缺少 user_id 过滤: ${u}`);
    const params = new URL(u).searchParams;
    let result = todoRows;
    const completed = params.get('completed');
    if (completed === 'eq.true') result = result.filter(row => row.completed);
    else if (completed === 'eq.false') result = result.filter(row => !row.completed);
    const rowLimit = params.get('limit');
    if (rowLimit) result = result.slice(0, Number(rowLimit));
    if (options.method === 'PATCH') {
      lastTodoPatch = { url: u, headers, body: JSON.parse(options.body) };
      return Response.json(patchResultRows);
    }
    return Response.json(result);
  }
  throw new Error(`unexpected PostgREST call: ${options.method ?? 'GET'} ${u}`);
}

function setup() {
  deviceTokenRows = null;
  todoRows = [];
  patchResultRows = [];
  lastUsedPatch = null;
  lastTodoPatch = null;
  const entries = new Map();
  globalThis.caches = {
    default: {
      match: async key => entries.get(key.url)?.clone(),
      put: async (key, value) => { entries.set(key.url, value.clone()); },
    },
  };
  globalThis.fetch = mockFetch;
}
function teardown() {
  delete globalThis.caches;
  delete globalThis.fetch;
}
const call = (path, init = {}) => {
  const headers = new Headers(init.headers);
  if (!init.authless && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${TOKEN}`);
  return worker.fetch(new Request(`https://todo-api.test${path}`, { method: init.method ?? 'GET', body: init.body, headers }), ENV, ctx);
};

test('401 for missing, malformed, unknown and revoked tokens', async () => {
  setup();
  try {
    let r = await call('/api/todos', { authless: true });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, 'missing_token');

    r = await call('/api/todos', { headers: { Authorization: 'Basic abcdef' } });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, 'missing_token');

    r = await call('/api/todos', { headers: { Authorization: `Bearer ${'x'.repeat(40)}` } });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, 'invalid_token');

    // 查无记录 = 未知 token 或已吊销 token，同一 401。
    deviceTokenRows = [];
    r = await call('/api/todos');
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, 'invalid_token');
  } finally { teardown(); }
});

test('GET lists active todos sorted, mapped to camelCase, and touches last_used_at', async () => {
  setup();
  try {
    todoRows = [rows.t6, rows.t1, rows.t4, rows.t2, rows.t5, rows.t3]; // 故意乱序
    const r = await call('/api/todos');
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.ok, true);
    assert.equal(typeof body.serverTime, 'string');
    // 默认 status=active：已完成 t1 不返回；排序 t3(高+期限) → t4(高+空) → t5(中) → t2 → t6
    assert.equal(body.count, 5);
    assert.deepEqual(body.todos.map(t => t.id), ['t3', 't4', 't5', 't2', 't6']);
    assert.deepEqual(Object.keys(body.todos[0]),
      ['id', 'title', 'description', 'category', 'quadrant', 'priority', 'dueDate', 'completed', 'completedAt', 'updatedAt']);
    assert.equal(body.todos[0].dueDate, '2026-10-25T10:00:00Z');
    assert.equal(body.todos[0].completedAt, null);

    const all = await (await call('/api/todos?status=all')).json();
    assert.equal(all.count, 6);
    assert.deepEqual(all.todos.map(t => t.id), ['t3', 't4', 't5', 't2', 't6', 't1']);

    const done = await (await call('/api/todos?status=completed')).json();
    assert.deepEqual(done.todos.map(t => t.id), ['t1']);

    const limited = await (await call('/api/todos?status=all&limit=2')).json();
    assert.deepEqual(limited.todos.map(t => t.id), ['t3', 't4']);

    await drain();
    assert.ok(lastUsedPatch?.body.last_used_at);
    assert.equal(lastUsedPatch.headers.get('Prefer'), 'return=minimal');
  } finally { teardown(); }
});

test('GET rejects bad status and limit with 400', async () => {
  setup();
  try {
    for (const query of ['?status=oops', '?limit=0', '?limit=201', '?limit=abc', '?limit=1.5']) {
      const r = await call(`/api/todos${query}`);
      assert.equal(r.status, 400, query);
      assert.equal((await r.json()).error.code, 'bad_request');
    }
  } finally { teardown(); }
});

test('PATCH flips completion, maintains server fields and ignores other fields', async () => {
  setup();
  try {
    patchResultRows = [rows.t3];
    const r = await call(`/api/todos/${UUID_OK}`, { method: 'PATCH', body: JSON.stringify({ completed: true, title: '试图改标题' }) });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.ok, true);
    assert.equal(body.todo.id, 't3');

    // 最要紧的一行断言：PostgREST 调用必须带显式 user_id 过滤
    assert.ok(lastTodoPatch.url.includes(`user_id=eq.user-1`), lastTodoPatch.url);
    assert.ok(lastTodoPatch.url.includes(`id=eq.${UUID_OK}`), lastTodoPatch.url);
    assert.equal(lastTodoPatch.headers.get('Prefer'), 'return=representation');
    assert.equal(lastTodoPatch.body.completed, true);
    assert.equal(lastTodoPatch.body.title, undefined); // 白名单外字段忽略
    assert.equal(typeof lastTodoPatch.body.updated_at, 'string');
    assert.equal(typeof lastTodoPatch.body.completed_at, 'string');

    await call(`/api/todos/${UUID_OK}`, { method: 'PATCH', body: JSON.stringify({ completed: false }) });
    assert.equal(lastTodoPatch.body.completed, false);
    assert.equal(lastTodoPatch.body.completed_at, null);
    assert.equal(typeof lastTodoPatch.body.updated_at, 'string');
  } finally { teardown(); }
});

test('PATCH rejects bad id/body and returns 404 for missing or foreign todos', async () => {
  setup();
  try {
    let r = await call('/api/todos/not-a-uuid', { method: 'PATCH', body: '{"completed":true}' });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error.code, 'bad_request');

    r = await call(`/api/todos/${UUID_OK}`, { method: 'PATCH', body: 'not-json' });
    assert.equal(r.status, 400);

    r = await call(`/api/todos/${UUID_OK}`, { method: 'PATCH', body: '{"completed":"yes"}' });
    assert.equal(r.status, 400);

    patchResultRows = []; // 目标不存在（含并发下已被删）或不属于该用户，统一 404
    r = await call(`/api/todos/${UUID_OK}`, { method: 'PATCH', body: '{"completed":true}' });
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error.code, 'not_found');
  } finally { teardown(); }
});

test('unknown routes 404 and OPTIONS 405', async () => {
  setup();
  try {
    assert.equal((await call('/other')).status, 404);
    assert.equal((await call('/api/todos', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await call('/api/todos', { method: 'OPTIONS' })).status, 405);
  } finally { teardown(); }
});

test('rate limit: 60 GET per minute per device, then 429 with Retry-After', async () => {
  setup();
  try {
    todoRows = [];
    for (let i = 0; i < 60; i++) assert.equal((await call('/api/todos')).status, 200);
    const r = await call('/api/todos');
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error.code, 'rate_limited');
    assert.equal(r.headers.get('Retry-After'), '60');
  } finally { teardown(); }
});
