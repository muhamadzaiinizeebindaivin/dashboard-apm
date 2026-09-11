-- Main donation submission
create table public.sumbangan (
  id uuid primary key default gen_random_uuid(),
  jenis_kumpulan text not null,
  nama_kumpulan text not null,
  negeri text not null,
  jenis_sumbangan text not null,
  lokasi_bantuan text not null,
  submitted_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Repeatable "Jumlah sumbangan" line items (one row per "+ Tambah sumbangan lain")
create table public.sumbangan_items (
  id uuid primary key default gen_random_uuid(),
  sumbangan_id uuid not null references public.sumbangan(id) on delete cascade,
  keterangan text not null
);

alter table public.sumbangan enable row level security;
alter table public.sumbangan_items enable row level security;

-- This form is public-facing (no login required to submit a donation),
-- so anyone can insert — but only signed-in staff (PKOP/PKON/PKOD) can
-- read the submissions to manage them.
create policy "sumbangan: anyone can insert"
  on public.sumbangan for insert
  with check (true);

create policy "sumbangan: signed-in staff can read"
  on public.sumbangan for select
  using (auth.uid() is not null);

-- Only PKOP/PKON (admin roles) can edit or delete after submission
create policy "sumbangan: admins can update"
  on public.sumbangan for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('pkop', 'pkon')
    )
  );

create policy "sumbangan: admins can delete"
  on public.sumbangan for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('pkop', 'pkon')
    )
  );

-- Same read/write pattern for the line items
create policy "sumbangan_items: anyone can insert"
  on public.sumbangan_items for insert
  with check (true);

create policy "sumbangan_items: signed-in staff can read"
  on public.sumbangan_items for select
  using (auth.uid() is not null);

create policy "sumbangan_items: admins can update"
  on public.sumbangan_items for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('pkop', 'pkon')
    )
  );

create policy "sumbangan_items: admins can delete"
  on public.sumbangan_items for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('pkop', 'pkon')
    )
  );

-- Needed for realtime updates if you later add a live list view
alter publication supabase_realtime add table public.sumbangan;
alter publication supabase_realtime add table public.sumbangan_items;
