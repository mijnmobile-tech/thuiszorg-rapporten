
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles select auth" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  location text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;

create policy "clients select auth" on public.clients for select to authenticated using (true);
create policy "clients insert auth" on public.clients for insert to authenticated with check (auth.uid() = created_by);
create policy "clients update auth" on public.clients for update to authenticated using (true);
create policy "clients delete auth" on public.clients for delete to authenticated using (true);

-- Reports
create type public.report_category as enum ('algemeen', 'medicatie', 'voeding', 'hygiene', 'sociaal', 'medisch', 'incident');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete set null,
  report_date date not null default current_date,
  report_time time not null default current_time,
  category public.report_category not null default 'algemeen',
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

create policy "reports select auth" on public.reports for select to authenticated using (true);
create policy "reports insert own" on public.reports for insert to authenticated with check (auth.uid() = author_id);
create policy "reports update own" on public.reports for update to authenticated using (auth.uid() = author_id);
create policy "reports delete own" on public.reports for delete to authenticated using (auth.uid() = author_id);

create index reports_client_date_idx on public.reports (client_id, report_date desc, report_time desc);

-- updated_at trigger for clients
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
