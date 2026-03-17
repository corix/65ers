-- Phase 5.5: Bug tracker. All users can insert; only authenticated can select.

create table public.bugs (
  id text primary key,
  description text not null,
  author text not null,
  viewport_width integer,
  device_info jsonb,
  created_at timestamptz not null default now()
);

alter table public.bugs enable row level security;

-- All users (anon + authenticated) can submit bugs
create policy "Allow anon insert on bugs"
  on public.bugs for insert
  to anon
  with check (true);

create policy "Allow authenticated insert on bugs"
  on public.bugs for insert
  to authenticated
  with check (true);

-- Only authenticated users can view bugs
create policy "Allow authenticated select on bugs"
  on public.bugs for select
  to authenticated
  using (true);
