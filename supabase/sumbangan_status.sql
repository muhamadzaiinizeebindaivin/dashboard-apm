alter table public.sumbangan
  add column if not exists status text not null default 'DALAM_PROSES'
  check (status in ('DALAM_PROSES', 'TERIMA', 'BATAL'));