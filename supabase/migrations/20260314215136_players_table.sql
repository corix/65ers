-- players table
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- RLS: allow anon read/write for Phase 4 (tighten in Phase 5 with auth)
alter table public.players enable row level security;

create policy "Allow anon read access on players"
  on public.players for select
  to anon
  using (true);

create policy "Allow anon insert access on players"
  on public.players for insert
  to anon
  with check (true);

create policy "Allow anon update access on players"
  on public.players for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon delete access on players"
  on public.players for delete
  to anon
  using (true);
