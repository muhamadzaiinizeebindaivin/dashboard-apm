insert into storage.buckets (id, name, public)
values ('logistik-dokumen', 'logistik-dokumen', false)
on conflict (id) do nothing;

-- Staff-only: only signed-in users can upload or read logistik documents
create policy "logistik-dokumen storage: staff can upload"
  on storage.objects for insert
  with check (bucket_id = 'logistik-dokumen' and auth.uid() is not null);

create policy "logistik-dokumen storage: staff can read"
  on storage.objects for select
  using (bucket_id = 'logistik-dokumen' and auth.uid() is not null);

create table public.logistik_dokumen (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.logistik_dokumen enable row level security;

create policy "logistik_dokumen: staff can insert"
  on public.logistik_dokumen for insert
  with check (auth.uid() is not null);

create policy "logistik_dokumen: staff can read"
  on public.logistik_dokumen for select
  using (auth.uid() is not null);
