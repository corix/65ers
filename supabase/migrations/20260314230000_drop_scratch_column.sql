-- Remove unused scratch column from games
alter table public.games drop column if exists scratch;
