-- Optional custom category, independent of the Eisenhower quadrant.
alter table public.user_todos add column if not exists category text;
