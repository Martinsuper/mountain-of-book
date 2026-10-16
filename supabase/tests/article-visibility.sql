-- Disposable database only; apply both migrations first. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
insert into public.site_admins values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.articles(title, body, visibility, status) values
 ('visibility-public', 'public body', 'public', 'published'),
 ('visibility-login', 'secret body', 'authenticated', 'published'),
 ('visibility-legacy', 'legacy body', 'restricted', 'published'),
 ('visibility-draft', 'draft body', 'public', 'draft');
insert into public.articles(title) values ('visibility-default');
select pg_temp.assert_true((select visibility = 'authenticated' from public.articles where title = 'visibility-default'), 'default login visible');
set local role anon;
select pg_temp.assert_true((select count(*) = 1 from public.articles where title like 'visibility-%'), 'anon sees only published public, including metadata');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.articles', 'INSERT'), 'anon cannot insert');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.is_site_admin()', 'EXECUTE'), 'anon cannot call admin RPC');
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.articles where title like 'visibility-%'), 'reader sees public and login but not legacy or drafts');
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select pg_temp.assert_true((select count(*) = 5 from public.articles where title like 'visibility-%'), 'admin sees all');
reset role;
rollback;
\echo 'PASS: public/login/legacy/draft visibility and anonymous ACL'
