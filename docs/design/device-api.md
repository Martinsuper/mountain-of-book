# 设备 API 设计方案（ESP32 待办接入）

## 背景与目标

站点是 Astro 纯静态站（GitHub Pages），没有自己的服务端 API；`/todo` 页的待办数据由浏览器以 Supabase 会话直连 `user_todos` 表读写。若要让 ESP32 等外部设备展示待办并修改完成状态，直接复用 Supabase REST 通路（密码换 JWT → PostgREST）虽然零改动，但要求把**主账号密码写进固件**，且设备侧需处理 JWT 每小时刷新与项目 `updated_at` 客户端维护约定，安全性与工程性都不适合长期使用。

本方案为 `user_todos` 开一条独立的**设备接入通道**，目标与边界：

- 设备持有一个独立于账号密码、可随时吊销的长效 token，泄露影响面收窄为「读待办 + 翻转完成状态」
- 设备能做的只有两件事：读待办列表、翻转完成状态；不能创建、删除、改标题、访问其他账号数据
- 网页端（`/todo` 页）行为完全不变，不感知设备的存在；站点构建配置零改动

## 总体架构

Worker 是唯一的信任边界：验证设备 token，再以 `service_role` 身份执行**带显式 user_id 过滤**的查询。token 的签发与吊销由账号页浏览器直连 Supabase 完成，站点不需要新的 API。

```text
ESP32 ──HTTPS──▶ todo-api.younote.top（Cloudflare Worker，新增）
                     │  Bearer 设备 token → SHA-256 → 查 device_tokens 得 user_id
                     │  service_role key（仅存于 Worker secret）
                     ▼
                  Supabase PostgREST ──▶ device_tokens / user_todos
网页端（不变）──浏览器 PKCE 会话──▶ Supabase（直连，RLS 照旧）
```

`calendar-proxy` 已通过 Cloudflare 自定义域名 `calendar.younote.top` 部署，说明 `younote.top` 托管在 Cloudflare，新 Worker 可用同样方式绑定 `todo-api.younote.top`（子域名以最终可用性为准），不依赖 workers.dev 域名的可达性。

## 数据库：新增 `device_tokens` 表

新迁移 `supabase/migrations/20261024000100_device_tokens.sql`，沿用现有迁移的 ACL + RLS 双层模式：

```sql
begin;

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,                    -- 设备名，如 "ESP32 桌面屏"
  token_hash text not null unique,       -- SHA-256 hex（64 字符），库里永不存明文
  token_prefix text not null,            -- 明文前 10 字符，仅用于界面识别
  created_at timestamptz not null default now(),
  last_used_at timestamptz,              -- Worker 以 service_role 更新
  revoked_at timestamptz,
  constraint device_tokens_name_len check (char_length(name) between 1 and 40)
);

create index device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

-- 与 user_todos 相同：显式 ACL，RLS 是第二道边界
revoke all on table public.device_tokens from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.device_tokens to authenticated;

create policy device_tokens_owner on public.device_tokens
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

commit;
```

要点：

- **只存哈希**。token 是 256 位随机数（非口令），SHA-256 即可，不需要 bcrypt。`unique` 约束自带的索引正好覆盖 Worker 的按哈希查询。
- 设备 token 与用户级联删除（`on delete cascade`），与 `user_todos` 一致。
- Worker 用 service_role 读此表（绕过 RLS），但只按哈希查 `id, user_id, revoked_at`，不暴露其他内容。

## Worker：`workers/device-api`

目录结构照抄 calendar-proxy，**零 npm 依赖**（用原生 fetch 调 PostgREST，不引入 supabase-js）：

```text
workers/device-api/
├── worker.mjs
├── worker.test.mjs
└── wrangler.toml
```

### wrangler.toml

```toml
name = "mountain-of-book-device-api"
main = "worker.mjs"
compatibility_date = "2026-01-01"
account_id = "aca40f02c77ec86bd4e9855887b9ee15"
routes = [{ pattern = "todo-api.younote.top", custom_domain = true }]
```

Secrets 不进配置文件：`wrangler secret put SUPABASE_URL` 与 `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`。

### 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/todos` | 列出待办，支持 `?status=active\|completed\|all`（默认 active）和 `?limit=1..200`（默认 50） |
| PATCH | `/api/todos/{id}` | 翻转完成状态，body 必须是 `{"completed": true\|false}` |
| 其他 | — | 404；`OPTIONS` 一律 405（不提供 CORS，设备用不到） |

### 认证流程（每个请求）

```text
1. 取 Authorization: Bearer bk_xxx        → 缺失/格式错 → 401 missing_token/invalid_token
2. SHA-256(token) → service_role 查 device_tokens
   where token_hash = ? and revoked_at is null
   → 无记录 → 401 invalid_token
3. ctx.waitUntil(更新 last_used_at)        → 异步，不阻塞响应
4. 以拿到的 user_id 进入路由处理
```

### API 契约

**GET /api/todos** 响应（字段名与前端 `TodoItem` 的 camelCase 保持一致，设备端与网页端心智统一）：

```json
{
  "ok": true,
  "serverTime": "2026-10-24T08:00:00Z",
  "count": 2,
  "todos": [
    {
      "id": "3f2c0a58-…",
      "title": "写周报",
      "description": null,
      "category": null,
      "quadrant": 1,
      "priority": "high",
      "dueDate": "2026-10-24T23:59:59+08:00",
      "completed": false,
      "completedAt": null,
      "updatedAt": "2026-10-23T12:00:00Z"
    }
  ]
}
```

默认排序在 Worker 内用 JS 排（PostgREST 排不了 priority 的自定义序）：未完成在前 → quadrant 1→4 → priority high→medium→low → dueDate 升序、空值在后。数据量小，不值得动 SQL。

**PATCH /api/todos/{id}**：

```text
请求:  {"completed": true}
响应:  {"ok": true, "todo": { …更新后的同结构对象… }}
```

服务端负责维护两个字段，设备端不碰项目约定：

- `updated_at = now()`（四象限排序约定，由服务端写，设备端无需关心）
- `completed_at`：true → now，false → null

**错误模型**统一为：

```json
{ "ok": false, "error": { "code": "invalid_token", "message": "人类可读说明" } }
```

| HTTP | code | 场景 |
| --- | --- | --- |
| 401 | `missing_token` / `invalid_token` | 无头 / 哈希查不到或已吊销 |
| 400 | `bad_request` | body 非法、limit 越界、路径参数非 UUID |
| 404 | `not_found` | id 不存在或不属于该用户（两者不区分，避免探测） |
| 429 | `rate_limited` | 超出限流 |
| 500 | `server_error` | 上游 Supabase 失败 |

### 实现要点（安全关键）

1. **service_role 绕过 RLS，所有 `user_todos` 查询必须显式带 `.eq('user_id', userId)`**——包括 PATCH。缺了它就是越权读写别人的待办，这是整个 Worker 最要紧的一行。
2. PATCH 的可写字段白名单只有 `completed`，其余字段进 body 一律忽略。
3. PostgREST 调用统一 `Prefer: return=representation`；PATCH 目标不存在（如并发下已被删）返回 404。
4. 限流用 Cache API 做每 PoP 的尽力而为计数（与 calendar-proxy 的 cooldown 同款手法）：GET 60 次/分/设备、PATCH 30 次/分/设备。防的是固件 bug 疯狂轮询，不是恶意攻击，如实标注为软限制。
5. 零依赖：SHA-256 用 Workers 内置 `crypto.subtle.digest`；PostgREST 用 fetch，带 `apikey` / `Authorization` 双头（service_role key）。

### 测试

`worker.test.mjs` 用 `node:test` + 模拟 fetch/caches，mirror calendar-proxy 的写法。覆盖：无头 401、坏 token 401、吊销 token 401、GET 正常与排序、PATCH 成功（断言发出的 PostgREST body 中 `completed_at` / `updated_at` 正确）、PATCH 他人 id 返回 404、非法 body 400、限流 429。

## 账号页：设备管理

在 `#account-private` 面板内、`#account-settings`（登录设置）之后加一个同款 `<details id="device-access">`，风格沿用现有段落。全部逻辑在浏览器用已有的 supabase-js 会话完成，站点构建零配置改动：

1. **列表**：设备名、`token_prefix`（如 `bk_9xK2mQ4a…`）、创建时间、最近使用时间、已吊销徽标；每行一个「吊销」按钮（`update revoked_at = now()`，不物理删除，保留审计）。
2. **添加设备**：输入设备名 → 生成 → **明文只显示这一次**，带复制按钮和「关闭后无法再查看」提示。
3. 生成算法（浏览器 WebCrypto，需 HTTPS，站点满足）：

```javascript
const bytes = crypto.getRandomValues(new Uint8Array(32));
const token = 'bk_' + base64url(bytes);   // 43 字符 + 前缀
const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
await supabase.from('device_tokens').insert({ name, token_hash: hash, token_prefix: token.slice(0, 10) });
```

## ESP32 对接约定

- **地址**：`https://todo-api.younote.top/api/todos`，认证仅 `Authorization: Bearer <token>` 头，不提供 query 参数形式（token 不进日志）。
- **轮询**：1–5 分钟一次 GET；按键交互时 PATCH。限流余量足够。
- **无需实现 JWT 刷新**——这是设备 token 相对直连 Supabase 的主要收益。
- **TLS**：`WiFiClientSecure` 预置 Cloudflare 证书链的根证书（`GTS Root R4` / `GTS Root R1`，部署后从实际证书确认），不要关闭证书校验。
- **存储**：token 存 NVS（Preferences）；JSON 用 ArduinoJson，50 条紧凑 JSON 约 5–8 KB，filter 只留需要的字段可再省一半。
- **屏显建议**：只渲染 `title` + quadrant/priority 图标 + dueDate（转本地日），completed 的移入底部或直接过滤。

## 部署与验证顺序

1. 应用迁移（以 postgres owner 执行，同现有迁移流程）。
2. 账号页加设备管理 UI，本地实测：生成 token → 查库确认只有哈希 → 吊销。
3. Worker 先跑 `node --test workers/device-api/worker.test.mjs`。
4. `wrangler deploy` + 配置两个 secrets，绑定 `todo-api.younote.top`。
5. curl 端到端验证：

```bash
curl -s https://todo-api.younote.top/api/todos -H "Authorization: Bearer bk_…"
curl -s -X PATCH https://todo-api.younote.top/api/todos/<id> \
  -H "Authorization: Bearer bk_…" -H "Content-Type: application/json" \
  -d '{"completed":true}'
# 网页 /todo 刷新后能看到状态同步，四象限排序正常（updated_at 已由服务端更新）
```

6. 本文档随实施补全实际部署信息（最终域名、secrets 名称）。

## 风险与边界

- **token 泄露的影响面**：只能读账号的待办和翻转状态，不能登录网站、不能删数据；账号页吊销即失效。相对「主账号密码进固件」是实打实的收窄。
- 明确不做：设备端创建/删除/改标题（以后需要再扩白名单）、实时推送（MQTT/WebSocket，轮询够用）、多管理员界面（账号页自助即可）。

## 涉及文件

- `supabase/migrations/20261024000100_device_tokens.sql` — 设备 token 表与 RLS
- `workers/device-api/`（`worker.mjs`、`worker.test.mjs`、`wrangler.toml`）— 设备 API Worker
- `src/pages/account/index.astro` — 设备管理段落（签发/吊销）
- `docs/design/device-api.md` — 本文档
