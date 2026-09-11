-- One access code per public page. No one can SELECT this table directly —
-- codes are only checked through the security-definer function below,
-- same pattern used for agency access codes on the APM project.
create table public.page_access_codes (
  page text primary key,
  code text not null
);

alter table public.page_access_codes enable row level security;
-- Deliberately no policies at all: RLS blocks all direct reads/writes,
-- even via the anon/authenticated API — only accessible via the function.

create function public.verify_page_code(p_page text, p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.page_access_codes
    where page = p_page and code = p_code
  );
$$;

-- Set your actual codes here (edit before running, or update later):
insert into public.page_access_codes (page, code) values
  ('sumbangan', 'SUMBANGAN2026'),
  ('paras', 'PARAS2026'),
  ('laporan', 'LAPORAN2026');
