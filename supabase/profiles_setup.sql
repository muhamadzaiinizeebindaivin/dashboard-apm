-- Roles: 'pkop' (Super admin), 'pkon' (Admin), 'pkod' (Operator)
create type public.user_role as enum ('pkop', 'pkon', 'pkod');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'pkod',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone signed in can read their own profile (needed to know their own role)
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Only PKOP (super admin) can read/manage every profile (for a future user-management screen)
create policy "profiles: pkop reads all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'pkop'
    )
  );

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
