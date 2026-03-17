-- Phase 5.3: Gate writes by auth. Anon = read-only; authenticated = full access.

-- games: drop anon write policies, add authenticated policies
drop policy if exists "Allow anon insert access on games" on public.games;
drop policy if exists "Allow anon update access on games" on public.games;
drop policy if exists "Allow anon delete access on games" on public.games;

create policy "Allow authenticated full access on games"
  on public.games for all
  to authenticated
  using (true)
  with check (true);

-- players: drop anon write policies, add authenticated policies
drop policy if exists "Allow anon insert access on players" on public.players;
drop policy if exists "Allow anon update access on players" on public.players;
drop policy if exists "Allow anon delete access on players" on public.players;

create policy "Allow authenticated full access on players"
  on public.players for all
  to authenticated
  using (true)
  with check (true);
