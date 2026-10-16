-- Apply as the Supabase database owner (postgres), never from a browser.
begin;

create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- The owner bypasses site_admins RLS; fixed search_path prevents object shadowing.
create function public.is_site_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_site_admin() from public, anon, authenticated;
grant execute on function public.is_site_admin() to authenticated;

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  visibility text not null default 'restricted' check (visibility in ('authenticated', 'restricted')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.articles.body is 'Markdown source; private content is fetched at runtime, never built into static files.';

create table public.article_grants (
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (article_id, user_id)
);
create index article_grants_user_id_idx on public.article_grants(user_id);

create table public.bookmarks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  article_path text not null,
  title text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_path)
);
create table public.reading_history (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  article_path text not null,
  title text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, article_path)
);
create table public.user_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index user_todos_user_id_idx on public.user_todos(user_id);

create function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
create trigger articles_updated_at before update on public.articles
for each row execute function public.touch_updated_at();
create trigger reading_history_updated_at before update on public.reading_history
for each row execute function public.touch_updated_at();

alter table public.site_admins enable row level security;
alter table public.articles enable row level security;
alter table public.article_grants enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reading_history enable row level security;
alter table public.user_todos enable row level security;

-- Explicit ACLs: RLS is a second boundary, not a substitute for SQL privileges.
revoke all on table public.site_admins, public.articles, public.article_grants,
  public.bookmarks, public.reading_history, public.user_todos from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.site_admins to authenticated;
grant select, insert, update, delete on public.articles, public.article_grants,
  public.bookmarks, public.reading_history, public.user_todos to authenticated;

create policy site_admins_self_read on public.site_admins
for select to authenticated using (user_id = (select auth.uid()));

create policy articles_admin_all on public.articles
for all to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy articles_reader on public.articles
for select to authenticated using (
  status = 'published' and (
    visibility = 'authenticated' or exists (
      select 1 from public.article_grants g
      where g.article_id = articles.id and g.user_id = (select auth.uid())
    )
  )
);

create policy article_grants_admin_all on public.article_grants
for all to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy article_grants_self_read on public.article_grants
for select to authenticated using (user_id = (select auth.uid()));

create policy bookmarks_owner on public.bookmarks
for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reading_history_owner on public.reading_history
for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_todos_owner on public.user_todos
for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Email lookup stays on the server: no auth.users listing is exposed to clients.
create function public.admin_grant_article(article uuid, email text)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  if not public.is_site_admin() then
    raise exception 'Site administrator required' using errcode = '42501';
  end if;
  select u.id into target_user from auth.users u
  where lower(u.email) = lower(btrim($2));
  if target_user is null then
    raise exception 'Invited user not found' using errcode = 'P0002';
  end if;
  insert into public.article_grants(article_id, user_id) values ($1, target_user)
  on conflict (article_id, user_id) do nothing;
end;
$$;
revoke all on function public.admin_grant_article(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_grant_article(uuid, text) to authenticated;

commit;
