-- 设备接入通道：device_tokens 为待办设备 API（workers/device-api）提供长效令牌。
-- Worker 以 service_role 只按 token_hash 查 id/user_id；网页端账号页负责签发与吊销。
-- Apply as the Supabase database owner (postgres), never from a browser.
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
