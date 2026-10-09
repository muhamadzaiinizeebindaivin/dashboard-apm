import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { MapPin, Droplets, Waves, Mountain, Flame, Wind, CloudRain, Zap, Siren, Building2, Biohazard } from 'lucide-react'
import { supabase } from './supabase'

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
    const { data } = await supabase.from('kategori_bencana').select('*').order('susunan').order('label')
    setKategori((data as KategoriBencana[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel('kategori-bencana')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kategori_bencana' }, () => muat())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muat])

  return kategori
}

export async function tambahKategori(label: string, warna: string, ikon: string, susunan: number) {
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  const { error } = await supabase.from('kategori_bencana').insert({ key, label: label.trim(), warna, ikon, susunan })
  return { key, error }
}

export function useTitikAktif() {
  const [titik, setTitik] = useState<TitikBencana[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    const { data } = await supabase
      .from('titik_bencana')
      .select('*')
      .eq('status', 'aktif')
      .order('tarikh_mula', { ascending: false })
    setTitik((data as TitikBencana[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel('titik-bencana-aktif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_bencana' }, () => muat())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muat])

  return { titik, loading }
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