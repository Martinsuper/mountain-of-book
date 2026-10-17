# 待办云端同步设计（localStorage → 账号数据库）

## 背景与目标

`/todo` 页面的四象限待办此前只保存在浏览器 `localStorage`（键 `todo_quadrant_data`），换设备或清缓存即丢失。目标是在不牺牲现有功能与离线体验的前提下，把待办数据的权威存储迁移到账号模块（Supabase `user_todos` 表），并给已产生的本地历史数据一条平滑的迁移路径。

## 数据模型

复用账号模块已有的 `user_todos` 表，通过增量迁移扩展字段（见 `supabase/migrations/20261017000100_user_todos_quadrant_sync.sql`）：

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `title` | text | 原 `text` 列重命名，账号页简版待办仍写此列 |
| `description` | text | 可选描述 |
| `quadrant` | smallint | 四象限 1-4，默认 1 |
| `priority` | text | high / medium / low，默认 medium |
| `due_date` | timestamptz | 截止时间（本地当天 23:59:59.999 的绝对时间） |
| `completed_at` | timestamptz | 完成时间，恢复待办时置空 |
| `updated_at` | timestamptz | 客户端随每次修改显式写入，四象限内排序依赖它，因此不建触发器 |

RLS、ACL 与 `user_todos_owner` 策略在基础迁移中已覆盖整表，新列无需额外策略；数据仍严格按 `user_id = auth.uid()` 隔离。

## 存储架构

新增 `src/lib/todo-store.ts` 作为统一存储层，页面脚本只依赖它暴露的 `TodoItem`/`TodoStorage` 模型与 `remoteTodoSync` 适配器（站点未配置 Supabase 时为 `null`）。

```text
用户操作（增/改/删/批量）
        │  同步修改内存 state，随后写 localStorage 镜像
        ▼
saveStorage()
        │  backend === 'remote' ?
        ├─ 否 → 结束（纯本地模式）
        └─ 是 → pumpRemoteSync() 写入泵
                diff = 服务端已确认快照 ↔ 当前内存态（内容级比较）
                ├─ 无差异 → 状态提示「已同步」
                ├─ 有差异 → push（insert / 逐条 update / in 删除）
                │     ├─ 成功 → 快照推进到新状态，重算差异（捕获发送期间的编辑）
                │     └─ 失败 → 提示「同步失败」，15 秒后自动重试
                ▼
        localStorage 镜像全程与内存态一致，供离线 / 登出后回退
```

关键行为约定：

- **权威存储**：登录态下数据库是权威，页面加载时 `fetch` 全量数据重建内存态；本地镜像只用于展示兜底与离线回退。
- **模式切换**：未登录或云端不可用（fetch 失败）时进入本地模式，读写 localStorage，体验与迁移前完全一致；页面顶部给出「登录账号」或「云端暂时不可用」的轻提示。
- **差异推送**：每次修改先变更内存态再入泵，泵以「服务端已确认快照 → 当前内存态」的内容差异驱动（不改 `updatedAt` 语义）。发送完成后重算差异，因此快速连续操作只会推送最终结果，失败后重试也不会重复写入；插入失败的条目仍留在内存，重试时再次尝试。
- **登入/登出跟随**：监听 `onAuthStateChange`，在其他标签页登录或退出后自动重新初始化存储模式。
- **本地历史数据导入**：登录后若云端为空且本地有数据且从未导入过（localStorage 标记 `todo_quadrant_imported`），页面显示一次性导入横幅；导入时旧的非 UUID 本地 ID 会重映射为 UUID。本地数据保留不删除，仅用标记避免重复询问；「暂不导入」只在本次会话内（sessionStorage）生效。

## 多端一致性与已知边界

- 同一账号多端：最后写入者胜出；每次打开页面全量拉取，冲突靠 `updatedAt` 的业务语义自然收敛，不引入向量化 CRDT。
- 删除不再提供软删除，登出后本地镜像仍可完整查看最近一次云端状态。
- 账号页「我的待办」与 `/todo` 读写同一张表：前者是标题级快捷入口，后者维护象限、日历与进度。

## 涉及文件

- `supabase/migrations/20261017000100_user_todos_quadrant_sync.sql` — 表结构升级
- `src/lib/todo-store.ts` — 数据模型、镜像读写、行转换、差异计算与 Supabase 适配器
- `src/pages/todo.astro` — 存储层接入、同步状态提示与导入横幅
- `src/pages/account/index.astro` — 简版待办改用 `title` 列，增加 `/todo` 入口
- `tests/account.spec.ts`、`supabase/tests/permissions.sql` — 同步列名变更
