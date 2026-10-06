import { supabase } from './supabase'

export type Keadaan = 'biasa' | 'rehat' | 'kecemasan'

export type RekodParas = {
  id: string
  negeri: string
  nama: string | null
  pangkat: string | null
  no_tel: string | null
  status: string
  keadaan: Keadaan | null
  mula_masa: string | null
  tamat_masa: string | null
  created_at: string // last GPS ping
}

export type LogKeadaan = { lokasi_id: string; keadaan: Keadaan; masa: string }

export type TapisRekodParas = {
  carian: string
  negeri: string
  status: '' | 'aktif' | 'tamat'
  keadaan: '' | 'rehat' | 'kecemasan' // "pernah" — at any point in the session
  dari: string // yyyy-mm-dd
  hingga: string
}

export const TAPIS_KOSONG: TapisRekodParas = {
  carian: '',
  negeri: '',
  status: '',
  keadaan: '',
  dari: '',
  hingga: '',
}

const KOLUM = 'id, negeri, nama, pangkat, no_tel, status, keadaan, mula_masa, tamat_masa, created_at'

function binaQuery(tapis: TapisRekodParas) {
  // Keadaan filter = sessions whose log contains that keadaan at least once,
  // via an inner-joined embed (one row per session, not per log entry).
  const select = tapis.keadaan ? `${KOLUM}, paras_keadaan_log!inner(keadaan)` : KOLUM
  let q = supabase.from('paras_lokasi').select(select, { count: 'exact' })

  // Strip characters that would break PostgREST's or() syntax
  const carian = tapis.carian.replace(/[,()%*]/g, ' ').trim()
  if (carian) q = q.or(`nama.ilike.%${carian}%,no_tel.ilike.%${carian}%`)
  if (tapis.negeri) q = q.eq('negeri', tapis.negeri)
  if (tapis.status === 'aktif') q = q.eq('status', 'aktif')
  if (tapis.status === 'tamat') q = q.neq('status', 'aktif')
  if (tapis.keadaan) q = q.eq('paras_keadaan_log.keadaan', tapis.keadaan)
  if (tapis.dari) q = q.gte('mula_masa', new Date(`${tapis.dari}T00:00:00`).toISOString())
  if (tapis.hingga) q = q.lte('mula_masa', new Date(`${tapis.hingga}T23:59:59.999`).toISOString())

  return q.order('mula_masa', { ascending: false, nullsFirst: false })
}

export async function ambilRekodParas(tapis: TapisRekodParas, dari: number, hingga: number) {
  const { data, count, error } = await binaQuery(tapis).range(dari, hingga)
  if (error) throw error
  return { rows: (data ?? []) as unknown as RekodParas[], count: count ?? 0 }
}

// Every matching row, fetched in 1000-row chunks (Supabase's per-request cap)
export async function ambilSemuaRekodParas(tapis: TapisRekodParas) {
  const SAIZ = 1000
  const semua: RekodParas[] = []
  for (let mula = 0; ; mula += SAIZ) {
    const { data, error } = await binaQuery(tapis).range(mula, mula + SAIZ - 1)
    if (error) throw error
    const baris = (data ?? []) as unknown as RekodParas[]
    semua.push(...baris)
    if (baris.length < SAIZ) break
  }
  return semua
}

// Chunked by 100 ids so the request URL stays short
export async function ambilLogKeadaan(ids: string[]): Promise<Record<string, LogKeadaan[]>> {
  const peta: Record<string, LogKeadaan[]> = {}
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from('paras_keadaan_log')
      .select('lokasi_id, keadaan, masa')
      .in('lokasi_id', ids.slice(i, i + 100))
      .order('masa', { ascending: true })
    if (error) throw error
    for (const l of (data ?? []) as LogKeadaan[]) (peta[l.lokasi_id] ??= []).push(l)
  }
  return peta
}

// --- Display helpers (shared by the panel and the PDF) ---

const DUA_MINIT = 2 * 60 * 1000

export type StatusRekod = 'aktif' | 'terputus' | 'tamat'

// "Terputus" = still marked aktif but no GPS ping for 2+ minutes
// (e.g. the officer closed the browser without pressing Tamat Jejak).
export function statusRekod(r: RekodParas): StatusRekod {
  if (r.status !== 'aktif') return 'tamat'
  return Date.now() - new Date(r.created_at).getTime() < DUA_MINIT ? 'aktif' : 'terputus'
}

export const STATUS_REKOD_LABEL: Record<StatusRekod, { label: string; className: string }> = {
  aktif: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700' },
  terputus: { label: 'Tiada Isyarat', className: 'bg-amber-100 text-amber-700' },
  tamat: { label: 'Tamat', className: 'bg-neutral-100 text-neutral-600' },
}

export const KEADAAN_LABEL: Record<Keadaan, { label: string; className: string }> = {
  biasa: { label: 'Biasa', className: 'bg-neutral-100 text-neutral-600' },
  rehat: { label: 'Rehat', className: 'bg-amber-100 text-amber-700' },
  kecemasan: { label: 'Kecemasan', className: 'bg-red-100 text-red-700' },
}

export function formatMasa(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatJam(iso: string) {
  return new Date(iso).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })
}

export function teksTamat(r: RekodParas) {
  if (r.tamat_masa) return formatMasa(r.tamat_masa)
  return statusRekod(r) === 'aktif' ? 'Masih aktif' : `Isyarat terakhir ${formatMasa(r.created_at)}`
}

export function formatTempoh(r: RekodParas) {
  if (!r.mula_masa) return '—'
  const akhir = r.tamat_masa
    ? new Date(r.tamat_masa)
    : statusRekod(r) === 'aktif'
      ? new Date()
      : new Date(r.created_at)
  const ms = akhir.getTime() - new Date(r.mula_masa).getTime()
  if (ms < 0) return '—'
  const minit = Math.floor(ms / 60000)
  const jam = Math.floor(minit / 60)
  return jam > 0 ? `${jam}j ${minit % 60}m` : `${minit}m`
}

export function teksLog(log: LogKeadaan[] | undefined) {
  if (!log || log.length === 0) return '—'
  return log.map((l) => `${formatJam(l.masa)} ${KEADAAN_LABEL[l.keadaan]?.label ?? l.keadaan}`).join('\n')
}