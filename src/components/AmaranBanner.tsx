import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Siren, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ConfirmModal } from './ConfirmModal'
import { useRealtime } from '../lib/realtime'

// Banner of the Laman Utama, like the APM Labuan dashboard:
// - active disasters scroll across ("limpas"), on the public page and once logged in,
// - a PARAS KECEMASAN (officer pressed the emergency button) blinks in red,
//   for staff only (it shows the officer's name and phone), with a "Hentikan" button.

type BencanaAktif = { kunci: string; nama: string; jenis: string; negeri: string[]; mangsa: number; pps_dibuka: number }

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

// Active disasters through one public RPC (works before login too: aggregated
// figures only, no personal data). Realtime refreshes it for staff; a slow
// poll covers the public page, where Realtime is blocked by RLS.
function useBencanaAktif() {
  const [senarai, setSenarai] = useState<BencanaAktif[]>(() => simpananBencana ?? [])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('bencana_aktif_awam')
    if (error) return
    simpananBencana = (data as BencanaAktif[]) ?? []
    setSenarai(simpananBencana)
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('amaran-banner-bencana', ['laporan_bencana', 'pps_pusat', 'bencana_tamat', 'titik_bencana'], muat, {
    tinjau: 60_000,
  })

  return senarai
}

function useKecemasanParas(aktif: boolean) {
  const [lokasi, setLokasi] = useState<Kecemasan[]>(() => (aktif ? simpananKecemasan ?? [] : []))
  const [kini, setKini] = useState(() => Date.now())

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from('paras_lokasi')
      .select('id, negeri, nama, pangkat, no_tel, created_at')
      .eq('status', 'aktif')
      .eq('keadaan', 'kecemasan')
    if (error) return // an emergency must not disappear because of one failed refresh
    simpananKecemasan = (data as Kecemasan[]) ?? []
    setLokasi(simpananKecemasan)
  }, [])

  useEffect(() => {
    if (!aktif) return
    muat()
    // The 30-min window also moves with time alone
    const t = setInterval(() => setKini(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [aktif, muat])
  useRealtime('amaran-banner-paras', ['paras_lokasi'], muat, { aktif })

  const semasa = aktif ? lokasi.filter((p) => kini - new Date(p.created_at).getTime() < TEMPOH_KECEMASAN) : []
  return { kecemasan: semasa, muatSemula: muat, buang: (id: string) => setLokasi((l) => l.filter((x) => x.id !== id)) }
}

// "- zaiini" -> "zaiini": placeholders typed in the PARAS form ("-", "tiada") are ignored
const isi = (s: string | null) => (s && !/^[-–—.\s]*$|^tiada$/i.test(s.trim()) ? s.trim() : '')
const namaPetugas = (k: Kecemasan) => [isi(k.pangkat), isi(k.nama)].filter(Boolean).join(' ')

const minitLalu = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return m < 1 ? 'baru sahaja' : `${m} minit lalu`
}

// `awam`: public home page (before login) — disasters only, no PARAS emergency
export function AmaranBanner({ awam = false }: { awam?: boolean }) {
  const { profile } = useAuth()
  const bencana = useBencanaAktif()
  const { kecemasan, muatSemula, buang } = useKecemasanParas(!awam)
  const bolehBukaParas = profile?.role === 'pkop' // Senarai PARAS is PKOP only
  const [menghentikan, setMenghentikan] = useState(false)
  const [dipilih, setDipilih] = useState<Kecemasan | null>(null)
  const [ralatHentikan, setRalatHentikan] = useState('')

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

  // Staff end an emergency once it has been handled (after confirming in the modal)
  function hentikan(k: Kecemasan) {
    setRalatHentikan('')
    setDipilih(k)
  }

  async function sahkanHentikan() {
    if (!dipilih) return
    setMenghentikan(true)
    setRalatHentikan('')
    const { error } = await supabase.rpc('hentikan_kecemasan_paras', { p_id: dipilih.id })
    setMenghentikan(false)
    if (error) {
      setRalatHentikan(
        error.code === '42501' ? 'Anda tiada kebenaran untuk menghentikan kecemasan.' : 'Gagal menghentikan kecemasan. Sila cuba lagi.',
      )
      return
    }
    buang(dipilih.id)
    setDipilih(null)
    muatSemula()
  }

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
          {b.pps_dibuka > 0 && ` · ${b.pps_dibuka} PPS dibuka`}
        </span>
      </span>
    ))

  // Already there on arrival (data kept from a previous visit): no animation.
  // Appearing later (first load, new disaster / emergency): it slides open
  // smoothly instead of pushing the page down in one jump.
  return (
    <>
      <ConfirmModal
        open={!!dipilih}
        title="Hentikan Kecemasan PARAS"
        message={
          dipilih
            ? `${namaPetugas(dipilih) || 'Petugas'} (${dipilih.negeri}${isi(dipilih.no_tel) ? ` · ${isi(dipilih.no_tel)}` : ''}) ` +
              `akan dikeluarkan daripada senarai kecemasan. Pastikan kecemasan ini telah ditangani sebelum meneruskan.`
            : ''
        }
        confirmLabel="Hentikan Kecemasan"
        loadingLabel="Menghentikan..."
        danger
        loading={menghentikan}
        error={ralatHentikan}
        onConfirm={sahkanHentikan}
        onCancel={() => setDipilih(null)}
      />
      <AnimatePresence initial={false}>
        {ada && (
          <motion.div
            key="amaran-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden text-left"
          >
            <div className="mb-4 mt-2 overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-md">
              {/* One blinking row per emergency, each with its own "Hentikan" button */}
              {kecemasan.map((k) => {
                const teks = [k.negeri, namaPetugas(k), isi(k.no_tel), minitLalu(k.created_at)]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <div key={k.id} role="alert" className="amaran-kelip flex items-center gap-2 px-5 py-2.5 text-sm text-white">
                    <Siren size={16} className="shrink-0" />
                    <span className="shrink-0 font-bold tracking-wide">KECEMASAN PARAS</span>
                    {bolehBukaParas ? (
                      <Link to="/senarai-paras" className="w-0 min-w-0 flex-1 truncate hover:underline">
                        {teks}
                      </Link>
                    ) : (
                      <span className="w-0 min-w-0 flex-1 truncate">{teks}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => hentikan(k)}
                      disabled={menghentikan && dipilih?.id === k.id}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-70"
                    >
                      {menghentikan && dipilih?.id === k.id && <Loader2 size={12} className="animate-spin" />}
                      Hentikan
                    </button>
                  </div>
                )
              })}

              {adaBencana && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">
                    <AlertTriangle size={14} />
                    Bencana Aktif ({bencana.length})
                  </span>
                  {/* w-0 + contain: the content never widens the page (no feedback with ResizeObserver) */}
                  <div
                    ref={bekasRef}
                    className="relative w-0 min-w-0 flex-1 overflow-hidden [contain:inline-size]"
                    aria-label="Senarai bencana aktif"
                  >
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
    </>
  )
}