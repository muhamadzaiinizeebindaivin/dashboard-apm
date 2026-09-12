-- Re-enable RLS (it was disabled during diagnostics)
alter table public.paras_lokasi enable row level security;

-- Anonymous "Jejak" submitters can't satisfy the SELECT policy needed for
-- upsert's internal conflict check, so route the write through a
-- security-definer function instead (same pattern as verify_page_code).
create or replace function public.track_paras_lokasi(
  p_id uuid,
  p_negeri text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.paras_lokasi (id, negeri, latitude, longitude, created_at)
  values (p_id, p_negeri, p_latitude, p_longitude, now())
  on conflict (id) do update
    set negeri = excluded.negeri,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        created_at = excluded.created_at;
end;
$$;

grant execute on function public.track_paras_lokasi(uuid, text, double precision, double precision)
  to anon, authenticated;

-- No longer needed now that the function handles this safely
drop policy if exists "paras_lokasi: anyone can update" on public.paras_lokasi;
