-- Allow authenticated users to delete bugs
create policy "Allow authenticated delete on bugs"
  on public.bugs for delete
  to authenticated
  using (true);
