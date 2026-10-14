import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { KategoriBencana, RingkasanBencanaNegeri, TitikBencana } from './titikBencana'
import type { JalanPeta } from '../components/PetaBencana'

// Data of the Laman Utama dashboard (public page and logged-in home):
// everything comes from read-only RPCs that also work before login.

export type PpsAwam = {
  id: string
  nama: string
  nama_bencana: string
  negeri: string
  daerah: string | null
  latitude: number | null
  longitude: number | null
  status: string
  jumlah_mangsa: number
  jumlah_keluarga: number
  dilapor_pada: string | null
  dibuka_pada: string
}

export type BencanaAktifAwam = {
  kunci: string
  nama: string
  jenis: string
  negeri: string[]
  mangsa: number
  pps_dibuka: number
}

export type PetaAwam = {
  kategori: KategoriBencana[]
  titik: TitikBencana[]
  pps: PpsAwam[]
  jalan: JalanPeta[]
  ringkasan: RingkasanBencanaNegeri[]
  bencana: BencanaAktifAwam[]
}

export type TitikTrend = { masa: string; mangsa: number; keluarga: number }

export type LaporanTerkini = {
  id: string
  jenis_laporan: string
  jenis_bencana: string | null
  nama_bencana: string | null
  negeri: string | null
  created_at: string
}

const KOSONG: PetaAwam = { kategori: [], titik: [], pps: [], jalan: [], ringkasan: [], bencana: [] }

// Kept between visits, so the page shows the last data at once
let simpanan: PetaAwam | null = null

// Realtime refreshes staff screens; the 60 s poll covers the public page
// (Realtime is filtered by RLS for anonymous visitors)
function useSegarkan(muat: () => void, saluran: string, jadual: string[]) {
  useEffect(() => {
    muat()
    let channel = supabase.channel(saluran)
    for (const t of jadual) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => muat())
    }
    channel.subscribe()
    const t = setInterval(muat, 60_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(t)
    }
  }, [muat, saluran, jadual])
}

const JADUAL_PETA = ['titik_bencana', 'pps_pusat', 'laporan_bencana', 'bencana_tamat', 'kategori_bencana']

export function usePetaAwam() {
  const [data, setData] = useState<PetaAwam>(() => simpanan ?? KOSONG)
  const [loading, setLoading] = useState(!simpanan)

  const muat = useCallback(async () => {
    const { data: hasil, error } = await supabase.rpc('peta_awam')
    if (!error && hasil) {
      simpanan = { ...KOSONG, ...(hasil as Partial<PetaAwam>) }
      setData(simpanan)
    }
    setLoading(false)
  }, [])

  useSegarkan(muat, 'papan-utama-peta', JADUAL_PETA)
  return { ...data, loading }
}

const JADUAL_TREND = ['laporan_bencana', 'pps_pusat']

export function useTrendMangsa(tempoh: '24j' | '7h') {
  const [trend, setTrend] = useState<TitikTrend[]>([])

  const muat = useCallback(async () => {
    const { data } = await supabase.rpc('trend_mangsa_awam', { p_tempoh: tempoh })
    setTrend((data as TitikTrend[]) ?? [])
  }, [tempoh])

  useSegarkan(muat, `papan-utama-trend-${tempoh}`, JADUAL_TREND)
  return trend
}

const JADUAL_LAPORAN = ['laporan_bencana']

export function useLaporanTerkini(had = 5) {
  const [senarai, setSenarai] = useState<LaporanTerkini[]>([])

  const muat = useCallback(async () => {
    const { data } = await supabase.rpc('laporan_terkini_awam', { p_had: had })
    setSenarai((data as LaporanTerkini[]) ?? [])
  }, [had])

  useSegarkan(muat, 'papan-utama-laporan', JADUAL_LAPORAN)
  return senarai
}