-- Incremental migration; run after 20260719000100. Existing restricted rows stay restricted.
begin;
alter table public.articles drop constraint articles_visibility_check;
alter table public.articles add constraint articles_visibility_check
  check (visibility in ('authenticated', 'public', 'restricted'));
alter table public.articles alter column visibility set default 'authenticated';
grant usage on schema public to anon;
grant select on public.articles to anon;
-- This policy must not call admin RPCs or inspect grants (anon cannot access either).
create policy articles_public_read on public.articles
for select to anon, authenticated
using (status = 'published' and visibility = 'public');
create index articles_published_created_at_idx on public.articles(created_at desc, id)
where status = 'published';
commit;
