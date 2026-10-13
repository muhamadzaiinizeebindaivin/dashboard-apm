import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Siren, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Banner of the logged-in Laman Utama, like the APM Labuan dashboard:
// - active disasters scroll across ("limpas"),
// - a PARAS KECEMASAN (officer pressed the emergency button) blinks in red.

type BencanaAktif = { kunci: string; nama: string; jenis: string; negeri: string[]; mangsa: number; ppsDibuka: number }

type Kecemasan = {
  id: string
  negeri: string
  nama: string | null
  pangkat: string | null
  no_tel: string | null
  created_at: string
}

// Same rule as Senarai PARAS: an emergency stays visible 30 min after the last GPS update
const TEMPOH_KECEMASAN = 30 * 60 * 1000

// Last data received, kept between visits of the Laman Utama: coming back to
// the page shows the banner straight away instead of making it pop in later
let simpananBencana: BencanaAktif[] | null = null
let simpananKecemasan: Kecemasan[] | null = null

function useBencanaAktif() {
  const [senarai, setSenarai] = useState<BencanaAktif[]>(() => simpananBencana ?? [])

  const muat = useCallback(async () => {
    const [{ data: lap }, { data: ring }, { data: tamat }, { data: titik }, { data: kat }] = await Promise.all([
      supabase
        .from('laporan_bencana')
        .select('nama_bencana, jenis_bencana, negeri, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('ringkasan_bencana_negeri').select('nama_bencana, negeri, mangsa, pps_dibuka'),
      supabase.from('bencana_tamat').select('nama_bencana'),
      // Points added by hand on the Peta Bencana (not linked to a report)
      supabase
        .from('titik_bencana')
        .select('id, kategori, negeri, daerah, lokasi, jumlah_mangsa')
        .eq('status', 'aktif')
        .is('nama_bencana', null),
      supabase.from('kategori_bencana').select('key, label'),
    ])
    const namaTamat = new Set(((tamat as { nama_bencana: string }[]) ?? []).map((t) => t.nama_bencana))

    // One entry per active disaster, newest report first
    const ikutNama = new Map<string, BencanaAktif>()
    for (const r of (lap as { nama_bencana: string | null; jenis_bencana: string | null; negeri: string | null }[]) ?? []) {
      const nama = r.nama_bencana?.trim()
      if (!nama || namaTamat.has(nama)) continue
      const b = ikutNama.get(nama) ?? { kunci: nama, nama, jenis: r.jenis_bencana || 'Bencana', negeri: [], mangsa: 0, ppsDibuka: 0 }
      if (r.negeri && !b.negeri.includes(r.negeri)) b.negeri.push(r.negeri)
      ikutNama.set(nama, b)
    }
    for (const x of (ring as { nama_bencana: string; negeri: string; mangsa: number; pps_dibuka: number }[]) ?? []) {
      const b = ikutNama.get(x.nama_bencana)
      if (!b) continue
      b.mangsa += x.mangsa
      b.ppsDibuka += x.pps_dibuka
      if (!b.negeri.includes(x.negeri)) b.negeri.push(x.negeri)
    }
    // Manual points: one entry each, named by their location
    const labelKategori = new Map(((kat as { key: string; label: string }[]) ?? []).map((k) => [k.key, k.label]))
    type TitikManual = { id: string; kategori: string; negeri: string; daerah: string | null; lokasi: string | null; jumlah_mangsa: number | null }
    const manual: BencanaAktif[] = ((titik as TitikManual[]) ?? []).map((t) => {
      const jenis = labelKategori.get(t.kategori) ?? t.kategori
      return {
        kunci: `titik-${t.id}`,
        nama: (t.lokasi || t.daerah || jenis).toUpperCase(),
        jenis,
        negeri: t.negeri && t.negeri !== '—' ? [t.negeri] : [],
        mangsa: t.jumlah_mangsa ?? 0,
        ppsDibuka: 0,
      }
    })

    simpananBencana = [...ikutNama.values(), ...manual]
    setSenarai(simpananBencana)
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel('amaran-banner-bencana')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_bencana' }, () => muat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pps_pusat' }, () => muat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bencana_tamat' }, () => muat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_bencana' }, () => muat())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muat])

  return senarai
}

function useKecemasanParas() {
  const [lokasi, setLokasi] = useState<Kecemasan[]>(() => simpananKecemasan ?? [])
  const [kini, setKini] = useState(() => Date.now())

  const muat = useCallback(async () => {
    const { data } = await supabase
      .from('paras_lokasi')
      .select('id, negeri, nama, pangkat, no_tel, created_at')
      .eq('status', 'aktif')
      .eq('keadaan', 'kecemasan')
    simpananKecemasan = (data as Kecemasan[]) ?? []
    setLokasi(simpananKecemasan)
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel('amaran-banner-paras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paras_lokasi' }, () => muat())
      .subscribe()
    // The 30-min window also moves with time alone
    const t = setInterval(() => setKini(Date.now()), 30_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(t)
    }
  }, [muat])

  return lokasi.filter((p) => kini - new Date(p.created_at).getTime() < TEMPOH_KECEMASAN)
}

const minitLalu = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return m < 1 ? 'baru sahaja' : `${m} minit lalu`
}

export function AmaranBanner() {
  const { profile } = useAuth()
  const bencana = useBencanaAktif()
  const kecemasan = useKecemasanParas()
  const bolehBukaParas = profile?.role === 'pkop' // Senarai PARAS is PKOP only

  // Width of the visible scrolling area: each copy is at least this wide,
  // so the two copies are never on screen at the same time
  const adaBencana = bencana.length > 0
  const bekasRef = useRef<HTMLDivElement>(null)
  const [lebarBekas, setLebarBekas] = useState(0)
  useEffect(() => {
    const el = bekasRef.current
    if (!el) return
    const pemerhati = new ResizeObserver(([e]) => setLebarBekas(e.contentRect.width))
    pemerhati.observe(el)
    return () => pemerhati.disconnect()
  }, [adaBencana])

  const ada = adaBencana || kecemasan.length > 0

  // Longer text scrolls for longer, so the speed stays readable
  const panjang = bencana.reduce((n, b) => n + b.nama.length + 40, 0)
  const tempoh = Math.max(18, Math.round(panjang / 6))

  const itemBencana = (kunci: string) =>
    bencana.map((b) => (
      <span key={`${kunci}-${b.kunci}`} className="flex shrink-0 items-center gap-2 pr-10">
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">BENCANA</span>
        <span className="font-semibold text-red-700">{b.nama}</span>
        <span className="text-neutral-600">
          {b.jenis}
          {b.negeri.length > 0 && ` · ${b.negeri.join(', ')}`}
          {b.mangsa > 0 && ` · ${b.mangsa} mangsa`}
          {b.ppsDibuka > 0 && ` · ${b.ppsDibuka} PPS dibuka`}
        </span>
      </span>
    ))

  const isiKecemasan = (
    <>
      <Siren size={16} className="shrink-0" />
      <span className="font-bold tracking-wide">KECEMASAN PARAS</span>
      <span className="min-w-0 flex-1 truncate">
        {kecemasan
          .map((k) =>
            [k.negeri, [k.pangkat, k.nama].filter(Boolean).join(' '), k.no_tel, minitLalu(k.created_at)]
              .filter(Boolean)
              .join(' · '),
          )
          .join('   |   ')}
      </span>
      {bolehBukaParas && <ChevronRight size={16} className="shrink-0" />}
    </>
  )

  // Already there on arrival (data kept from a previous visit): no animation.
  // Appearing later (first load, new disaster / emergency): it slides open
  // smoothly instead of pushing the page down in one jump.
  return (
    <AnimatePresence initial={false}>
      {ada && (
        <motion.div
          key="amaran-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="mb-4 mt-2 overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-md">
            {kecemasan.length > 0 &&
              (bolehBukaParas ? (
                <Link
                  to="/senarai-paras"
                  role="alert"
                  className="amaran-kelip flex items-center gap-2 px-5 py-2.5 text-sm text-white"
                >
                  {isiKecemasan}
                </Link>
              ) : (
                <div role="alert" className="amaran-kelip flex items-center gap-2 px-5 py-2.5 text-sm text-white">
                  {isiKecemasan}
                </div>
              ))}

            {adaBencana && (
              <div className="flex items-center gap-3 px-5 py-3">
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">
                  <AlertTriangle size={14} />
                  Bencana Aktif ({bencana.length})
                </span>
                {/* Two copies side by side scroll by half their width: a seamless loop */}
                <div ref={bekasRef} className="relative min-w-0 flex-1 overflow-hidden" aria-label="Senarai bencana aktif">
                  <div className="amaran-limpas flex w-max text-sm" style={{ animationDuration: `${tempoh}s` }}>
                    <span className="flex shrink-0" style={{ minWidth: lebarBekas }}>
                      {itemBencana('a')}
                    </span>
                    <span aria-hidden="true" className="flex shrink-0" style={{ minWidth: lebarBekas }}>
                      {itemBencana('b')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}