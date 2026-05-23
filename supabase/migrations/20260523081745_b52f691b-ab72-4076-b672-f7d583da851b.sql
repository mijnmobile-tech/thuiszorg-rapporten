
-- Tighten policies (remove always-true)
drop policy "clients update auth" on public.clients;
drop policy "clients delete auth" on public.clients;
create policy "clients update auth" on public.clients for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "clients delete auth" on public.clients for delete to authenticated using (auth.uid() is not null);

-- Fix set_updated_at search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Lock down function execution (triggers still work)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
