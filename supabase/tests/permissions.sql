-- Run only against a disposable/staging Supabase database as postgres.
-- psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
--   -v admin_email='admin@example.test' -v reader_email='reader@example.test' \
--   -f supabase/tests/permissions.sql
-- Both users must already exist in Authentication > Users. All changes roll back.
\set ON_ERROR_STOP on
begin;
select set_config('test.admin_email', :'admin_email', true);
select set_config('test.reader_email', :'reader_email', true);
select set_config('test.admin', (select id::text from auth.users where lower(email) = lower(current_setting('test.admin_email'))), true);
select set_config('test.reader', (select id::text from auth.users where lower(email) = lower(current_setting('test.reader_email'))), true);

create function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;
create function pg_temp.expect_denied(command text)
returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when insufficient_privilege then return;
  end;
  raise exception 'FAIL: expected permission denial: %', command;
end;
$$;
select pg_temp.assert_true(
  nullif(current_setting('test.admin'), '') is not null
  and nullif(current_setting('test.reader'), '') is not null
  and current_setting('test.admin') <> current_setting('test.reader'),
  'Provide two distinct existing Authentication users');

-- Force known roles for this transaction, even if reader was previously an admin.
delete from public.site_admins where user_id = current_setting('test.reader')::uuid;
insert into public.site_admins values (current_setting('test.admin')::uuid) on conflict do nothing;
select set_config('test.open', gen_random_uuid()::text, true);
select set_config('test.private', gen_random_uuid()::text, true);
select set_config('test.draft', gen_random_uuid()::text, true);
select set_config('test.hidden', gen_random_uuid()::text, true);
select set_config('test.path', '/permission-test/' || gen_random_uuid()::text || '/', true);

-- Impersonation is available only to the trusted SQL connection, not browser users.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role', 'authenticated')::text, true);
select pg_temp.assert_true(public.is_site_admin(), 'admin RPC returns true');
select pg_temp.assert_true((select count(*) = 1 from public.site_admins), 'admin can read self membership');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.articles', 'TRUNCATE'), 'authenticated has no TRUNCATE privilege');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.article_grants', 'TRIGGER'), 'authenticated has no TRIGGER privilege');
insert into public.articles(id, title, body, visibility, status) values
  (current_setting('test.open')::uuid, 'test open', '# Markdown', 'authenticated', 'published'),
  (current_setting('test.private')::uuid, 'test restricted', 'private', 'restricted', 'published'),
  (current_setting('test.draft')::uuid, 'test draft', 'draft', 'authenticated', 'draft'),
  (current_setting('test.hidden')::uuid, 'test hidden', 'hidden', 'restricted', 'published');
select public.admin_grant_article(current_setting('test.private')::uuid, upper(current_setting('test.reader_email')));
select public.admin_grant_article(current_setting('test.private')::uuid, current_setting('test.reader_email'));
select public.admin_grant_article(current_setting('test.draft')::uuid, current_setting('test.reader_email'));
insert into public.article_grants values (current_setting('test.hidden')::uuid, current_setting('test.admin')::uuid);
select pg_temp.assert_true((select count(*) = 4 from public.articles where id in (
  current_setting('test.open')::uuid, current_setting('test.private')::uuid,
  current_setting('test.draft')::uuid, current_setting('test.hidden')::uuid)), 'admin sees all including drafts');
update public.articles set title = 'updated by admin' where id = current_setting('test.draft')::uuid;
delete from public.article_grants where article_id = current_setting('test.draft')::uuid;
insert into public.article_grants values (current_setting('test.draft')::uuid, current_setting('test.reader')::uuid);
select pg_temp.expect_denied('insert into public.site_admins values (current_setting(''test.reader'')::uuid)');
select pg_temp.expect_denied('delete from public.site_admins');

-- A forged user_metadata role is deliberately ignored by the database.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.reader'), 'role', 'authenticated', 'user_metadata', json_build_object('role', 'admin', 'is_admin', true))::text, true);
select pg_temp.assert_true(not public.is_site_admin(), 'metadata cannot promote reader');
select pg_temp.assert_true((select count(*) = 0 from public.site_admins), 'reader cannot see admin membership');
select pg_temp.assert_true((select count(*) = 2 from public.articles where id in (
  current_setting('test.open')::uuid, current_setting('test.private')::uuid,
  current_setting('test.draft')::uuid, current_setting('test.hidden')::uuid)), 'reader sees published open and granted only');
select pg_temp.assert_true(not exists(select 1 from public.articles where id = current_setting('test.draft')::uuid), 'grant does not expose draft');
select pg_temp.assert_true(not exists(select 1 from public.article_grants where user_id <> current_setting('test.reader')::uuid), 'reader sees only own grants');
select pg_temp.expect_denied('insert into public.articles(title) values (''forbidden'')');
select pg_temp.expect_denied('insert into public.article_grants values (current_setting(''test.hidden'')::uuid, current_setting(''test.reader'')::uuid)');
select pg_temp.expect_denied('select public.admin_grant_article(current_setting(''test.hidden'')::uuid, current_setting(''test.reader_email''))');
select pg_temp.expect_denied('select id, email from auth.users');
select pg_temp.expect_denied('update public.site_admins set user_id = current_setting(''test.reader'')::uuid');
with changed as (update public.articles set title = 'forbidden' where id = current_setting('test.open')::uuid returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'reader cannot update article');
with changed as (delete from public.articles where id = current_setting('test.private')::uuid returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'reader cannot delete article');
with changed as (delete from public.article_grants where article_id = current_setting('test.private')::uuid returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'reader cannot revoke grant');
with changed as (update public.article_grants set user_id = current_setting('test.admin')::uuid where article_id = current_setting('test.private')::uuid returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'reader cannot change grant');

-- Exercise both USING and WITH CHECK on every personal table.
do $$
declare t text; n integer;
begin
  foreach t in array array['bookmarks', 'reading_history', 'user_todos'] loop
    if t = 'user_todos' then
      execute 'insert into public.user_todos(text) values (''own todo'')';
      perform pg_temp.expect_denied('insert into public.user_todos(user_id, text) values (current_setting(''test.admin'')::uuid, ''foreign'')');
    else
      execute format('insert into public.%I(article_path, title) values (current_setting(''test.path''), ''own'')', t);
      perform pg_temp.expect_denied(format('insert into public.%I(user_id, article_path, title) values (current_setting(''test.admin'')::uuid, current_setting(''test.path''), ''foreign'')', t));
    end if;
    perform pg_temp.expect_denied(format('update public.%I set user_id = current_setting(''test.admin'')::uuid where user_id = current_setting(''test.reader'')::uuid', t));
    execute format('update public.%I set %I = $1 where user_id = current_setting(''test.reader'')::uuid', t, case when t = 'user_todos' then 'text' else 'title' end) using 'own updated';
    get diagnostics n = row_count;
    perform pg_temp.assert_true(n >= 1, t || ' own update works');
  end loop;
end;
$$;

-- Even administrators have no cross-user access to personal data.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role', 'authenticated')::text, true);
do $$
declare t text; n integer;
begin
  foreach t in array array['bookmarks', 'reading_history', 'user_todos'] loop
    execute format('select count(*) from public.%I where user_id = current_setting(''test.reader'')::uuid', t) into n;
    perform pg_temp.assert_true(n = 0, t || ' cross-user select hidden');
    execute format('update public.%I set user_id = current_setting(''test.admin'')::uuid where user_id = current_setting(''test.reader'')::uuid', t);
    get diagnostics n = row_count;
    perform pg_temp.assert_true(n = 0, t || ' cross-user update blocked');
    execute format('delete from public.%I where user_id = current_setting(''test.reader'')::uuid', t);
    get diagnostics n = row_count;
    perform pg_temp.assert_true(n = 0, t || ' cross-user delete blocked');
  end loop;
end;
$$;
-- Revoking a grant immediately removes visibility.
delete from public.article_grants where article_id = current_setting('test.private')::uuid;
with changed as (delete from public.articles where id = current_setting('test.hidden')::uuid returning *)
select pg_temp.assert_true((select count(*) = 1 from changed), 'admin can delete article');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.reader'), 'role', 'authenticated')::text, true);
select pg_temp.assert_true(not exists(select 1 from public.articles where id = current_setting('test.private')::uuid), 'revoked article is hidden');
delete from public.bookmarks where article_path = current_setting('test.path');
delete from public.reading_history where article_path = current_setting('test.path');
-- All reader todos are test-transaction changes only; ROLLBACK restores preexisting rows.
delete from public.user_todos where user_id = current_setting('test.reader')::uuid;
select pg_temp.assert_true(not exists(select 1 from public.bookmarks where article_path = current_setting('test.path')), 'bookmarks own delete works');
select pg_temp.assert_true(not exists(select 1 from public.reading_history where article_path = current_setting('test.path')), 'reading history own delete works');
select pg_temp.assert_true(not exists(select 1 from public.user_todos where user_id = current_setting('test.reader')::uuid), 'todos own delete works');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare t text;
begin
  foreach t in array array['site_admins', 'article_grants', 'bookmarks', 'reading_history', 'user_todos'] loop
    perform pg_temp.expect_denied(format('select * from public.%I', t));
    perform pg_temp.expect_denied(format('delete from public.%I', t));
    perform pg_temp.expect_denied(format('insert into public.%I default values', t));
  end loop;
end;
$$;
select pg_temp.expect_denied('select public.is_site_admin()');
select pg_temp.expect_denied('select public.admin_grant_article(current_setting(''test.private'')::uuid, current_setting(''test.reader_email''))');
reset role;
rollback;
\echo 'PASS: RLS, RPC permissions, metadata spoofing and ownership checks (rolled back).'
