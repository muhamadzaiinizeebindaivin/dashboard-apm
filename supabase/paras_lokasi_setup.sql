create table public.paras_lokasi (
  id uuid primary key default gen_random_uuid(),
  negeri text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.paras_lokasi enable row level security;

-- Anyone can submit their GPS position (public page, no login needed to send)
create policy "paras_lokasi: anyone can insert"
  on public.paras_lokasi for insert
  with check (true);

-- Only signed-in staff can read the tracked positions (map view)
create policy "paras_lokasi: signed-in staff can read"
  on public.paras_lokasi for select
  using (auth.uid() is not null);

alter publication supabase_realtime add table public.paras_lokasi;
