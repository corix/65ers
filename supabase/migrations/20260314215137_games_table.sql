-- games table
create table public.games (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  players jsonb not null,
  winner text,
  totals jsonb not null,
  rounds jsonb not null,
  scratch boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

-- Index for archive "newest first" queries
create index games_date_desc_idx on public.games (date desc);

-- Index for Ignore flow (filter by source = 'fixture')
create index games_source_idx on public.games (source);

-- RLS: allow anon read/write for Phase 4 (tighten in Phase 5 with auth)
alter table public.games enable row level security;

create policy "Allow anon read access on games"
  on public.games for select
  to anon
  using (true);

create policy "Allow anon insert access on games"
  on public.games for insert
  to anon
  with check (true);

create policy "Allow anon update access on games"
  on public.games for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon delete access on games"
  on public.games for delete
  to anon
  using (true);
