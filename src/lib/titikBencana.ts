import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { MapPin, Droplets, Waves, Mountain, Flame, Wind, CloudRain, Zap, Siren, Building2, Biohazard } from 'lucide-react'
import { supabase } from './supabase'
import { useRealtime } from './realtime'
import { ambilSemua } from './ambilSemua'

export type KategoriBencana = {
  id: string
  key: string
  label: string
  warna: string
  ikon: string
  susunan: number
}

export type TitikBencana = {
  id: string
  kategori: string
  negeri: string
  daerah: string | null
  lokasi: string | null
  pps: string | null
  jumlah_kir: number | null
  jumlah_mangsa: number | null
  jumlah_rumah_terjejas: number | null
  catatan: string | null
  latitude: number
  longitude: number
  status: 'aktif' | 'selesai'
  tarikh_mula: string
  tarikh_selesai: string | null
  nama_bencana: string | null // set for points created from a report (Laporan Awal / Tetapkan lokasi)
}

// Form state: every field as a string, converted on save
export type BorangTitik = {
  kategori: string
  negeri: string
  daerah: string
  lokasi: string
  pps: string
  jumlah_kir: string
  jumlah_mangsa: string
  jumlah_rumah_terjejas: string
  catatan: string
}

// Same icon set as SediaOps, plus two for the national categories
export const IKON_KATEGORI: Record<string, LucideIcon> = {
  MapPin,
  Droplets,
  Waves,
  Mountain,
  Flame,
  Wind,
  CloudRain,
  Zap,
  Siren,
  Building2,
  Biohazard,
}

export const PILIHAN_IKON = Object.keys(IKON_KATEGORI)

export const PILIHAN_WARNA = [
  '#2563EB',
  '#0891B2',
  '#7C3AED',
  '#DC2626',
  '#F97316',
  '#CA8A04',
  '#16A34A',
  '#4D7C0F',
  '#92400E',
  '#475569',
]

export function ikonKategori(nama?: string | null): LucideIcon {
  return (nama && IKON_KATEGORI[nama]) || MapPin
}

// Colours come from the DB and end up in inline HTML on the map — only accept #RRGGBB
export function warnaSelamat(warna?: string | null) {
  return warna && /^#[0-9a-f]{6}$/i.test(warna) ? warna : '#475569'
}

export function borangKosong(negeri = ''): BorangTitik {
  return {
    kategori: '',
    negeri,
    daerah: '',
    lokasi: '',
    pps: '',
    jumlah_kir: '',
    jumlah_mangsa: '',
    jumlah_rumah_terjejas: '',
    catatan: '',
  }
}

export function borangDaripada(t: TitikBencana): BorangTitik {
  const s = (n: number | null) => (n == null ? '' : String(n))
  return {
    kategori: t.kategori,
    negeri: t.negeri,
    daerah: t.daerah ?? '',
    lokasi: t.lokasi ?? '',
    pps: t.pps ?? '',
    jumlah_kir: s(t.jumlah_kir),
    jumlah_mangsa: s(t.jumlah_mangsa),
    jumlah_rumah_terjejas: s(t.jumlah_rumah_terjejas),
    catatan: t.catatan ?? '',
  }
}

// Live figures (Laporan Semasa) written into the form's number fields: used when
// saving a point that follows its reports, and to pre-fill "Lengkapkan"
export function denganDataTerkini(b: BorangTitik, d: DataTerkini): BorangTitik {
  return {
    ...b,
    jumlah_kir: String(d.keluarga),
    jumlah_mangsa: String(d.mangsa),
    jumlah_rumah_terjejas: d.rumahTerjejas != null ? String(d.rumahTerjejas) : b.jumlah_rumah_terjejas,
  }
}

export function semakBorang(b: BorangTitik): string | null {
  if (!b.kategori) return 'Sila pilih kategori.'
  if (!b.negeri) return 'Sila pilih negeri.'
  const nombor: [string, string][] = [
    ['Jumlah KIR', b.jumlah_kir],
    ['Jumlah Mangsa', b.jumlah_mangsa],
    ['Jumlah Rumah Terjejas', b.jumlah_rumah_terjejas],
  ]
  for (const [label, v] of nombor) {
    if (v.trim() !== '' && !/^\d+$/.test(v.trim())) return `${label} mesti nombor bulat (0 atau lebih).`
  }
  return null
}

export function keRekod(b: BorangTitik) {
  const teks = (s: string) => s.trim() || null
  const nombor = (s: string) => (s.trim() === '' ? null : Number(s))
  return {
    kategori: b.kategori,
    negeri: b.negeri,
    daerah: teks(b.daerah),
    lokasi: teks(b.lokasi),
    pps: teks(b.pps),
    jumlah_kir: nombor(b.jumlah_kir),
    jumlah_mangsa: nombor(b.jumlah_mangsa),
    jumlah_rumah_terjejas: nombor(b.jumlah_rumah_terjejas),
    catatan: teks(b.catatan),
  }
}

export function useKategoriBencana() {
  const [kategori, setKategori] = useState<KategoriBencana[]>([])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.from('kategori_bencana').select('*').order('susunan').order('label')
    if (error) return
    setKategori((data as KategoriBencana[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('kategori-bencana', ['kategori_bencana'], muat)

  return kategori
}

// "FENOMENA AIR PASANG" -> "Fenomena Air Pasang". Only a name typed entirely in
// capitals is changed; normal typing ("Tumpahan minyak", "Banjir PPS") is kept as is.
export function kemaskanLabel(label: string) {
  const t = label.trim().replace(/\s+/g, ' ')
  if (!/[A-Z]/.test(t) || t !== t.toUpperCase()) return t
  return t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, ruang: string, huruf: string) => ruang + huruf.toUpperCase())
}

export async function tambahKategori(label: string, warna: string, ikon: string, susunan: number) {
  const labelKemas = kemaskanLabel(label)
  const key = labelKemas
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  const { error } = await supabase.from('kategori_bencana').insert({ key, label: labelKemas, warna, ikon, susunan })
  return { key, error }
}

// Name, colour and icon of an existing category. The key stays the same, so the
// map points and reports that use it follow the change automatically.
export async function kemaskiniKategori(key: string, label: string, warna: string, ikon: string) {
  const { data, error } = await supabase
    .from('kategori_bencana')
    .update({ label: label.trim(), warna, ikon })
    .eq('key', key)
    .select('key')
  // RLS refuses silently (0 rows updated): report it as a permission error
  if (!error && (!data || data.length === 0)) return { error: { code: '42501', message: 'Tiada kebenaran' } }
  return { error }
}

// How many map points (active or finished) use each category, by key
export async function kiraPenggunaanKategori(): Promise<Record<string, number>> {
  const data = await ambilSemua<{ kategori: string }>(() =>
    supabase.from('titik_bencana').select('kategori').order('id'),
  )
  const kiraan: Record<string, number> = {}
  for (const t of data) kiraan[t.kategori] = (kiraan[t.kategori] ?? 0) + 1
  return kiraan
}

// Delete a category, only if no map point uses it (checked again right before
// deleting, in case a point was added since the list was shown)
export async function padamKategori(key: string): Promise<{ error: { code: string; message: string } | null }> {
  const { count, error: ralatKira } = await supabase
    .from('titik_bencana')
    .select('id', { count: 'exact', head: true })
    .eq('kategori', key)
  if (ralatKira) return { error: ralatKira }
  if (count) return { error: { code: 'DIGUNAKAN', message: `${count} titik` } }

  const { data, error } = await supabase.from('kategori_bencana').delete().eq('key', key).select('key')
  if (error) return { error }
  // RLS refuses silently (0 rows deleted): report it as a permission error
  if (!data || data.length === 0) return { error: { code: '42501', message: 'Tiada kebenaran' } }
  return { error: null }
}

export function useTitikAktif() {
  const [titik, setTitik] = useState<TitikBencana[]>([])
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState(false)

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from('titik_bencana')
      .select('*')
      .eq('status', 'aktif')
      .order('tarikh_mula', { ascending: false })
    setLoading(false)
    setRalat(!!error)
    if (error) return // keep the points already on the map
    setTitik((data as TitikBencana[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('titik-bencana-aktif', ['titik_bencana'], muat)

  return { titik, loading, ralat }
}

export function formatTarikh(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Live figures per disaster + state (view ringkasan_bencana_negeri), fed by Laporan Semasa
export type RingkasanBencanaNegeri = {
  nama_bencana: string
  negeri: string
  pps_dibuka: number
  mangsa: number
  keluarga: number
  laporan_terakhir: string | null
  trend: string | null
  rumah_terjejas: number | null
}

export type DataTerkini = {
  mangsa: number
  keluarga: number
  ppsDibuka: number
  rumahTerjejas: number | null
  laporanTerakhir: string | null
  trend: string | null
  seluruhBencana: boolean // no figures for the point's own state: totals of the whole disaster
}

export function useRingkasanBencana() {
  const [ringkasan, setRingkasan] = useState<RingkasanBencanaNegeri[]>([])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.from('ringkasan_bencana_negeri').select('*')
    if (error) return
    setRingkasan((data as RingkasanBencanaNegeri[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  // A Laporan Semasa changes the PPS and adds a report: both refresh the figures
  useRealtime('ringkasan-bencana-negeri', ['pps_pusat', { jadual: 'laporan_bencana', peristiwa: 'INSERT' }], muat)

  return ringkasan
}

// Figures for one map point: its disaster in its state, else the whole disaster
export function dataTerkiniTitik(t: TitikBencana, ringkasan: RingkasanBencanaNegeri[]): DataTerkini | null {
  if (!t.nama_bencana) return null
  const baris = ringkasan.filter((r) => r.nama_bencana === t.nama_bencana)
  if (baris.length === 0) return null

  const sama = baris.find((r) => r.negeri === t.negeri)
  const pilih = sama ? [sama] : baris
  const terkini = [...pilih].sort(
    (a, b) => new Date(b.laporan_terakhir ?? 0).getTime() - new Date(a.laporan_terakhir ?? 0).getTime(),
  )[0]
  const rumah = pilih.filter((r) => r.rumah_terjejas != null)

  return {
    mangsa: pilih.reduce((n, r) => n + r.mangsa, 0),
    keluarga: pilih.reduce((n, r) => n + r.keluarga, 0),
    ppsDibuka: pilih.reduce((n, r) => n + r.pps_dibuka, 0),
    rumahTerjejas: rumah.length ? rumah.reduce((n, r) => n + (r.rumah_terjejas ?? 0), 0) : null,
    laporanTerakhir: terkini.laporan_terakhir,
    trend: terkini.trend,
    seluruhBencana: !sama,
  }
}

// Compact number for the marker badge: 1861 -> "1.9k"
export function nomborRingkas(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n)
}