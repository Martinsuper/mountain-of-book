-- 待办页四象限数据从浏览器 localStorage 迁移到账号：user_todos 承接完整字段。
-- Apply as the Supabase database owner (postgres), never from a browser.
begin;

-- text 升级为 title，与待办页 / src/lib/todo-store.ts 的字段对应。
alter table public.user_todos rename column text to title;

alter table public.user_todos
  add column description text,
  add column quadrant smallint not null default 1 check (quadrant between 1 and 4),
  add column priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  add column due_date timestamptz,
  add column completed_at timestamptz,
  add column updated_at timestamptz not null default now();

comment on table public.user_todos is 'Account-scoped quadrant todos; authoritative store for /todo, with a browser localStorage mirror for offline fallback.';
comment on column public.user_todos.quadrant is 'Eisenhower quadrant 1-4; client manages ordering via updated_at, so no server trigger overwrites it.';
comment on column public.user_todos.due_date is 'Tz-aware deadline set to local end-of-day; clients convert to a local date for grouping.';

-- 说明：updated_at 由客户端随每次修改显式写入（四象限排序依赖它），
-- 与 articles 的 touch_updated_at 触发器不同，这里不建触发器。
-- 原 text 列的既有数据自动变为 title；RLS、ACL 与 user_todos_owner 策略覆盖全部新列，无需改动。

commit;
