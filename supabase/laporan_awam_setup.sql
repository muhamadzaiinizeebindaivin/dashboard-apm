-- Storage bucket for uploaded laporan files
insert into storage.buckets (id, name, public)
values ('laporan-awam', 'laporan-awam', false)
on conflict (id) do nothing;

-- Anyone can upload (public submission form, no login required)
create policy "laporan-awam storage: anyone can upload"
  on storage.objects for insert
  with check (bucket_id = 'laporan-awam');

-- Only signed-in staff can read/list the uploaded files
create policy "laporan-awam storage: staff can read"
  on storage.objects for select
  using (bucket_id = 'laporan-awam' and auth.uid() is not null);

-- Table tracking each submission (type + which file it points to)
create table public.laporan_awam (
  id uuid primary key default gen_random_uuid(),
  jenis_laporan text not null check (jenis_laporan in ('awal', 'semasa')),
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.laporan_awam enable row level security;

create policy "laporan_awam: anyone can insert"
  on public.laporan_awam for insert
  with check (true);

create policy "laporan_awam: signed-in staff can read"
  on public.laporan_awam for select
  using (auth.uid() is not null);
