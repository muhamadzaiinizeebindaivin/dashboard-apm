-- NGO submissions
create table public.ngo (
  id uuid primary key default gen_random_uuid(),
  nama_kumpulan text not null,
  negeri text not null,
  lokasi_bencana text not null,
  jenis_bantuan text[] not null default '{}',
  submitted_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.ngo enable row level security;

-- This tab is Super Admin only in the app already (RequireRole(['pkop'])),
-- so restrict at the database level to match, using the same is_pkop()
-- helper introduced for the profiles/sumbangan policies.
create policy "ngo: pkop can insert"
  on public.ngo for insert
  with check (public.is_pkop());

create policy "ngo: pkop can read"
  on public.ngo for select
  using (public.is_pkop());