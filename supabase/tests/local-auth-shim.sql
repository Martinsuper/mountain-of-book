-- LOCAL SCRATCH POSTGRES ONLY. Never run this in Supabase or production.
-- Minimal auth interface for testing migration SQL without Supabase CLI/Docker.
-- This is not a replacement for testing against Supabase Auth in staging.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text unique);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values
  ('11111111-1111-4111-8111-111111111111', 'admin@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'reader@example.test');
