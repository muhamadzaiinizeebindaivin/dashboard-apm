import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FileText, FileClock, FileDown, FileSpreadsheet, Home, ChevronRight, Tent, Flag, Inbox, CheckCircle2, CalendarRange } from 'lucide-react'
import { janaExcelNasional } from '../lib/eksportExcel'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { DashboardCard } from '../components/DashboardCard'
import { Memuat, Skeleton } from '../components/Memuatkan'
import { LaporanNasionalPreview } from '../components/LaporanNasionalPreview'
import { useAuth } from '../hooks/useAuth'
import { ambilKorbanSemasa, ambilLaporanNasional, ambilPpsDitutup24Jam } from '../lib/laporanNasional'
import type { ItemLaporanNasional, KorbanNegeri, PpsDitutup } from '../lib/laporanNasional'
import { useKawasan, parlimenNegeri, dunNegeri, parlimenBagiDun } from '../lib/kawasanPilihanRaya'
import { ambilDataGraf } from '../lib/laporanNasionalGraf'
import type { TitikGraf } from '../lib/laporanNasionalGraf'
import { bangunLaporanNasionalDoc } from '../lib/janaLaporanNasional'
import { cariZon } from '../lib/laporanBencana'
import { useJenisBencana } from '../lib/jenisBencana'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { HAD_TIADA_KEMASKINI_JAM } from '../lib/ppsPusat'

const ZON_LIST = ['Utara', 'Tengah', 'Selatan', 'Timur', 'Borneo']

// Placeholder with the same layout as the Laporan Bencana Nasional card (title + 3 buttons,
// filters, figures, graph, table), so nothing jumps when the real card arrives
function RangkaLaporanNasional() {
  return (
    <Memuat label="Memuatkan Laporan Bencana Nasional" className="mt-6">
      <DashboardCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <h2 className="text-base font-semibold text-neutral-900">Laporan Bencana Nasional</h2>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 py-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-56 rounded-xl" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </DashboardCard>
    </Memuat>
  )
}

// "14:05" today, "20/10 14:05" on another day
function masaMuatTurun(iso: string) {
  const t = new Date(iso)
  const jam = t.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false })
  return t.toDateString() === new Date().toDateString()
    ? jam
    : `${t.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' })} ${jam}`
}

const PILIHAN = [
  {
    to: 'laporan-awal',
    label: 'Laporan Awal',
    desc: 'Laporan pertama sebaik sahaja kejadian dikenal pasti.',
    icon: FileText,
  },
  {
    to: 'laporan-semasa',
    label: 'Laporan Semasa',
    desc: 'Kemas kini berterusan sepanjang tempoh operasi.',
    icon: FileClock,
  },
  {
    to: 'pps',
    label: 'Pengurusan PPS',
    desc: 'Pantau PPS yang dibuka dan sahkan penutupan.',
    icon: Tent,
  },
  {
    to: 'bencana',
    label: 'Pengurusan Bencana',
    desc: 'Senarai bencana aktif dan tamatkan bencana yang telah selesai.',
    icon: Flag,
  },
  {
    to: 'statistik',
    label: 'Statistik Musim',
    desc: 'Tetapkan tarikh setiap musim atau fenomena cuaca dan lihat statistik penuhnya.',
    icon: CalendarRange,
  },
]

export function Sekretariat() {
  const location = useLocation()
  const { profile } = useAuth()
  // Filter choices = the categories of the Bencana map (also loads their colours for the report)
  const senaraiJenis = useJenisBencana()
  const onLanding = location.pathname === '/sekretariat'
  const [toast, setToast] = useState<ToastState>(null)
  // true from the start: the report is fetched as soon as the page opens
  const [menjanaLaporan, setMenjanaLaporan] = useState(true)
  const [menMuatTurun, setMenMuatTurun] = useState(false)
  const [menjanaExcel, setMenjanaExcel] = useState(false)
  // No active report yet: calm empty state instead of an error toast
  const [tiadaBencana, setTiadaBencana] = useState(false)
  const [menjanaGraf, setMenjanaGraf] = useState(false)
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [tapisJenis, setTapisJenis] = useState('')
  const [tapisZon, setTapisZon] = useState('')
  const [tapisStatus, setTapisStatus] = useState<'' | 'aktif' | 'tamat'>('')
  const [tapisDari, setTapisDari] = useState('') // YYYY-MM-DD
  const [tapisHingga, setTapisHingga] = useState('')
  // Constituency of a YB: only offered once a Negeri is chosen
  const [tapisParlimen, setTapisParlimen] = useState('')
  const [tapisDun, setTapisDun] = useState('')
  const kawasan = useKawasan()
  const [previewData, setPreviewData] = useState<{
    items: ItemLaporanNasional[]
    ditutup: PpsDitutup[]
    korban: KorbanNegeri[]
    masaJana: Date
  } | null>(null)
  const [dataGraf, setDataGraf] = useState<{ duaJam: TitikGraf[]; harian: TitikGraf[] } | null>(null)
  const [bilCadangan, setBilCadangan] = useState(0)
  const [bilSenyap, setBilSenyap] = useState(0)
  // Jana Excel status, shared by all staff: green = a report arrived after the last full download
  const [muatTurunTerakhir, setMuatTurunTerakhir] = useState<{ pada: string; laporanHingga: string | null } | null>(null)
  const [laporanTerakhir, setLaporanTerakhir] = useState<string | null>(null)
  // The card waits for this too, so the Jana Excel button never flashes green then gray
  const [statusExcelSedia, setStatusExcelSedia] = useState(false)

  // Badges on the Pengurusan PPS card: PPS waiting for a closure decision,
  // and open PPS with no report for more than HAD_TIADA_KEMASKINI_JAM hours
  const kiraBadge = useCallback(async () => {
    const had = new Date(Date.now() - HAD_TIADA_KEMASKINI_JAM * 3_600_000).toISOString()
    const [cadangan, senyap] = await Promise.all([
      supabase.from('pps_pusat').select('id', { count: 'exact', head: true }).eq('status', 'cadangan_tutup'),
      supabase
        .from('pps_pusat')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dibuka')
        .lt('dilapor_pada', had),
    ])
    if (cadangan.error || senyap.error) return // keep the last counts
    setBilCadangan(cadangan.count ?? 0)
    setBilSenyap(senyap.count ?? 0)
  }, [])

  useEffect(() => {
    if (!onLanding) return
    kiraBadge()
    // The "no update" count also changes with time alone
    const t = setInterval(kiraBadge, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [onLanding, kiraBadge])
  useRealtime('pps-badge', ['pps_pusat'], kiraBadge, { aktif: onLanding })

  const muatStatusExcel = useCallback(async () => {
    const [log, lap] = await Promise.all([
      supabase
        .from('eksport_excel_log')
        .select('dimuat_turun_pada, laporan_hingga')
        .order('dimuat_turun_pada', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('laporan_bencana').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setStatusExcelSedia(true)
    if (log.error || lap.error) return // keep the last state
    setMuatTurunTerakhir(log.data ? { pada: log.data.dimuat_turun_pada, laporanHingga: log.data.laporan_hingga } : null)
    setLaporanTerakhir(lap.data?.created_at ?? null)
  }, [])

  useEffect(() => {
    if (onLanding) muatStatusExcel()
  }, [onLanding, muatStatusExcel])
  // Turns green again as soon as a new report arrives, and gray on every screen when someone downloads
  useRealtime(
    'status-excel',
    ['eksport_excel_log', { jadual: 'laporan_bencana', peristiwa: 'INSERT' }],
    muatStatusExcel,
    { aktif: onLanding },
  )

  // Skeleton while the national report (PKOP only) or the Excel status is still loading
  const tunjukRangka =
    onLanding &&
    !tiadaBencana &&
    (previewData ? !statusExcelSedia : !profile || (profile.role === 'pkop' && menjanaLaporan))

  const excelBaharu =
    !muatTurunTerakhir ||
    (!!laporanTerakhir &&
      (!muatTurunTerakhir.laporanHingga || new Date(laporanTerakhir) > new Date(muatTurunTerakhir.laporanHingga)))

  // Load the national report's content automatically as soon as the page opens.
  useEffect(() => {
    if (onLanding && profile?.role === 'pkop') {
      handleJanaLaporanNasional()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLanding, profile?.role])

  // While empty, the first report received shows the national report by itself
  useRealtime(
    'laporan-nasional-pertama',
    [{ jadual: 'laporan_bencana', peristiwa: 'INSERT' }],
    () => handleJanaLaporanNasional(),
    { aktif: onLanding && tiadaBencana && profile?.role === 'pkop' },
  )

  async function handleJanaLaporanNasional() {
    setMenjanaLaporan(true)
    try {
      const [items, ditutup, korban] = await Promise.all([
        ambilLaporanNasional(),
        ambilPpsDitutup24Jam(),
        ambilKorbanSemasa(),
      ])
      if (items.length === 0) {
        setPreviewData(null)
        setTiadaBencana(true)
        return
      }
      setTiadaBencana(false)
      setPreviewData({ items, ditutup, korban, masaJana: new Date() })
      setTapisNegeri('')
      setTapisJenis('')
      setTapisZon('')
      setTapisStatus('')
      setTapisDari('')
      setTapisHingga('')
      setTapisParlimen('')
      setTapisDun('')
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana laporan. Sila cuba lagi.' })
    } finally {
      setMenjanaLaporan(false)
    }
  }

  // The graphs replay history across every disaster, so a filter change
  // re-runs that replay with the same filter — this is what keeps the
  // graphs, the table/map, and the downloaded PDF all showing the same slice.
  useEffect(() => {
    if (!previewData) return
    let dibatalkan = false
    setMenjanaGraf(true)
    ambilDataGraf({
      negeri: tapisNegeri || undefined,
      jenis: tapisJenis || undefined,
      zon: tapisZon || undefined,
    })
      .then((hasil) => {
        if (!dibatalkan) setDataGraf(hasil)
      })
      .catch(() => {
        if (dibatalkan) return
        setDataGraf(null)
        setToast({ type: 'error', message: 'Gagal memuatkan graf. Sila cuba lagi.' })
      })
      .finally(() => {
        if (!dibatalkan) setMenjanaGraf(false)
      })
    return () => {
      dibatalkan = true
    }
  }, [previewData, tapisNegeri, tapisJenis, tapisZon])

  // Status + date filters work per disaster: kept when it was happening at any
  // time between Dari and Hingga (first report -> Tamat, or today if still active)
  const infoBencana = new Map<string, { mula: number; tamat: string | null }>()
  for (const i of previewData?.items ?? []) {
    const k = i.namaBencana.trim()
    const mula = i.mulaPada ? new Date(i.mulaPada).getTime() : -Infinity
    const ada = infoBencana.get(k)
    infoBencana.set(k, { mula: Math.min(ada?.mula ?? Infinity, mula), tamat: i.tamatPada ?? ada?.tamat ?? null })
  }
  const adaTapisBencana = !!(tapisStatus || tapisDari || tapisHingga)
  const lulusBencana = (nama: string) => {
    if (!adaTapisBencana) return true
    const b = infoBencana.get(nama.trim())
    if (!b) return false
    if (tapisStatus === 'aktif' && b.tamat) return false
    if (tapisStatus === 'tamat' && !b.tamat) return false
    const akhir = b.tamat ? new Date(b.tamat).getTime() : Date.now()
    if (tapisDari && akhir < new Date(`${tapisDari}T00:00:00`).getTime()) return false
    if (tapisHingga && b.mula > new Date(`${tapisHingga}T23:59:59.999`).getTime()) return false
    return true
  }

  // Parlimen / ADUN filter: works on each PPS, then every row (disaster + daerah)
  // is rebuilt from only its PPS in that constituency
  const adaTapisKawasan = !!(tapisParlimen || tapisDun)
  const lulusKawasan = (p: { parlimen: string | null; dun: string | null }) =>
    (!tapisParlimen || p.parlimen === tapisParlimen) && (!tapisDun || p.dun === tapisDun)
  const potongIkutKawasan = (i: ItemLaporanNasional): ItemLaporanNasional[] => {
    if (!adaTapisKawasan) return [i]
    const pilih = (i.ppsButiran ?? []).filter(lulusKawasan)
    if (pilih.length === 0) return []
    return [
      {
        ...i,
        ppsButiran: pilih,
        pps: pilih.map((p) => p.nama).join('\n'),
        jumlahMangsa: pilih.reduce((n, p) => n + p.jumlahMangsa, 0),
        jumlahKeluarga: pilih.reduce((n, p) => n + p.jumlahKeluarga, 0),
      },
    ]
  }

  const itemsTertapis = previewData
    ? previewData.items
        .filter(
          (i) =>
            (!tapisNegeri || i.negeri === tapisNegeri) &&
            (!tapisJenis || i.jenisBencana === tapisJenis) &&
            (!tapisZon || i.zon === tapisZon) &&
            lulusBencana(i.namaBencana),
        )
        .flatMap(potongIkutKawasan)
    : []

  // Closed PPS follow the same filters (jenis comes from their disaster,
  // which stays listed in the report even with all its PPS closed)
  const jenisIkutBencana = new Map(previewData?.items.map((i) => [i.namaBencana.trim(), i.jenisBencana]) ?? [])
  const ditutupTertapis = previewData
    ? previewData.ditutup.filter(
        (p) =>
          (!tapisNegeri || p.negeri === tapisNegeri) &&
          (!tapisZon || cariZon(p.negeri) === tapisZon) &&
          (!tapisJenis || jenisIkutBencana.get(p.nama_bencana) === tapisJenis) &&
          lulusBencana(p.nama_bencana) &&
          (!adaTapisKawasan || lulusKawasan(p)),
      )
    : []

  // Casualties follow the same filters
  const korbanTertapis = previewData
    ? previewData.korban.filter(
        (k) =>
          (!tapisNegeri || k.negeri === tapisNegeri) &&
          (!tapisZon || cariZon(k.negeri) === tapisZon) &&
          (!tapisJenis || jenisIkutBencana.get(k.nama_bencana) === tapisJenis) &&
          lulusBencana(k.nama_bencana),
      )
    : []

  // NDCC "Laporan Situasi Bencana" Excel: one file per state + disaster type, same filters as the preview
  async function janaExcel() {
    setMenjanaExcel(true)
    try {
      // Only a full download (no filter) counts as "downloaded" for the shared status
      const tapisTarikh = !!(tapisDari || tapisHingga)
      const penuh = !tapisNegeri && !tapisZon && !tapisJenis && !tapisTarikh && !adaTapisKawasan
      // Latest report included in this download, read (server time) before building the files
      const { data: terkini } = penuh
        ? await supabase.from('laporan_bencana').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle()
        : { data: null }
      const bil = await janaExcelNasional({
        negeri: tapisNegeri || undefined,
        zon: tapisZon || undefined,
        jenis: tapisJenis || undefined,
        // Date filter: only the disasters it keeps
        nama: tapisTarikh ? [...new Set(itemsTertapis.map((i) => i.namaBencana.trim()))] : undefined,
        parlimen: tapisParlimen || undefined,
        dun: tapisDun || undefined,
      })
      if (bil > 0 && penuh) {
        // If this fails the button just stays green: the file itself was downloaded
        await supabase.from('eksport_excel_log').insert({ laporan_hingga: terkini?.created_at ?? null })
        muatStatusExcel()
      }
      setToast(
        bil === 0
          ? { type: 'error', message: 'Tiada bencana aktif untuk tapisan ini.' }
          : { type: 'success', message: bil === 1 ? 'Fail Excel dijana.' : `${bil} fail Excel dijana (satu folder bagi setiap negeri).` },
      )
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana Excel. Sila cuba lagi.' })
    } finally {
      setMenjanaExcel(false)
    }
  }

  async function muatTurunLaporan() {
    if (!previewData) return
    setMenMuatTurun(true)
    try {
      const { doc, namaFail } = await bangunLaporanNasionalDoc(
        itemsTertapis,
        ditutupTertapis,
        {
          negeri: tapisNegeri || undefined,
          jenis: tapisJenis || undefined,
          zon: tapisZon || undefined,
        },
        korbanTertapis,
        // Constituency named on the cover and in the file name
        adaTapisKawasan ? [tapisNegeri, tapisParlimen, tapisDun].filter(Boolean) : [],
      )
      doc.save(namaFail)
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana PDF. Sila cuba lagi.' })
    } finally {
      setMenMuatTurun(false)
    }
  }

  return (
    <div>
      {onLanding && (
        <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-sm">
            <Home size={13} className="text-neutral-400" />
            <span className="text-neutral-400">Portal</span>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Sekretariat</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Sekretariat</h1>
        </div>
      )}

      {onLanding && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILIHAN.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-start gap-4 rounded-2xl border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-md transition-colors hover:border-emerald-500"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Icon size={20} />
              </div>
              <div>
                <h2 className="flex items-center gap-2 font-medium text-neutral-900">
                  {label}
                  {to === 'pps' && bilCadangan > 0 && (
                    <span
                      title="Cadangan tutup menunggu tindakan"
                      className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white"
                    >
                      {bilCadangan}
                    </span>
                  )}
                  {to === 'pps' && bilSenyap > 0 && (
                    <span
                      title={`PPS dibuka tanpa laporan lebih ${HAD_TIADA_KEMASKINI_JAM} jam`}
                      className="rounded-full bg-neutral-500 px-2 py-0.5 text-xs font-semibold text-white"
                    >
                      {bilSenyap}
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {onLanding && tiadaBencana && !previewData && (
        <DashboardCard className="mt-6">
          <h2 className="border-b border-neutral-100 pb-4 text-base font-semibold text-neutral-900">
            Laporan Bencana Nasional
          </h2>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox size={28} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-600">Tiada bencana aktif buat masa ini.</p>
            <p className="max-w-md text-xs text-neutral-400">
              Laporan Nasional akan dipaparkan secara automatik sebaik sahaja Laporan Awal atau Laporan Semasa diterima.
            </p>
          </div>
        </DashboardCard>
      )}

      {tunjukRangka && <RangkaLaporanNasional />}

      {onLanding && previewData && statusExcelSedia && (
        <DashboardCard className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <h2 className="text-base font-semibold text-neutral-900">Laporan Bencana Nasional</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={muatTurunLaporan}
                disabled={menMuatTurun}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
              >
                <FileDown size={15} />
                {menMuatTurun ? 'Menjana PDF...' : 'Muat Turun PDF'}
              </button>
              <button
                onClick={janaExcel}
                disabled={menjanaExcel || tapisStatus === 'tamat'}
                title={
                  tapisStatus === 'tamat'
                    ? 'Excel NDCC hanya untuk bencana aktif'
                    : (excelBaharu
                        ? 'Ada laporan baharu sejak muat turun terakhir. '
                        : `Sudah dimuat turun ${masaMuatTurun(muatTurunTerakhir!.pada)}, tiada laporan baharu sejak itu. `) +
                      (tapisNegeri
                        ? `Laporan Situasi Bencana ${tapisNegeri} dalam format Excel NDCC`
                        : 'Satu fail Excel bagi setiap negeri (dalam satu fail .zip, satu folder bagi setiap negeri)')
                }
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                  excelBaharu
                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-neutral-200 bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                {excelBaharu ? <FileSpreadsheet size={15} /> : <CheckCircle2 size={15} />}
                {menjanaExcel
                  ? 'Menjana Excel...'
                  : excelBaharu
                    ? 'Jana Excel'
                    : `Dimuat turun ${masaMuatTurun(muatTurunTerakhir!.pada)}`}
              </button>
              <button
                onClick={() => {
                  setPreviewData(null)
                  setDataGraf(null)
                }}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 py-3">
            <select
              value={tapisNegeri}
              onChange={(e) => {
                setTapisNegeri(e.target.value)
                // Another state: its constituencies change too
                setTapisParlimen('')
                setTapisDun('')
              }}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Negeri</option>
              {NEGERI_LIST.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {tapisNegeri && (
              <>
                <select
                  value={tapisParlimen}
                  onChange={(e) => {
                    setTapisParlimen(e.target.value)
                    setTapisDun('')
                  }}
                  className="h-9 max-w-[14rem] rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
                >
                  <option value="">Semua Parlimen</option>
                  {parlimenNegeri(kawasan, tapisNegeri).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {/* KL, Putrajaya and Labuan have no ADUN */}
                {dunNegeri(kawasan, tapisNegeri).length > 0 && (
                  <select
                    value={tapisDun}
                    onChange={(e) => {
                      const dun = e.target.value
                      setTapisDun(dun)
                      // ADUN chosen first: its Parlimen follows
                      if (dun && !tapisParlimen) setTapisParlimen(parlimenBagiDun(kawasan, tapisNegeri, dun) ?? '')
                    }}
                    className="h-9 max-w-[14rem] rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
                  >
                    <option value="">Semua ADUN</option>
                    {dunNegeri(kawasan, tapisNegeri, tapisParlimen || undefined).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            <select
              value={tapisJenis}
              onChange={(e) => setTapisJenis(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Jenis Bencana</option>
              {senaraiJenis.map((j) => (
                <option key={j.key} value={j.label}>
                  {j.label}
                </option>
              ))}
            </select>
            <select
              value={tapisZon}
              onChange={(e) => setTapisZon(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Zon</option>
              {ZON_LIST.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <select
              value={tapisStatus}
              onChange={(e) => setTapisStatus(e.target.value as '' | 'aktif' | 'tamat')}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="tamat">Tamat</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={tapisDari}
                max={tapisHingga || undefined}
                onChange={(e) => setTapisDari(e.target.value)}
                title="Dari tarikh"
                aria-label="Dari tarikh"
                className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 outline-none focus:border-emerald-600"
              />
              <span className="text-sm text-neutral-400">–</span>
              <input
                type="date"
                value={tapisHingga}
                min={tapisDari || undefined}
                onChange={(e) => setTapisHingga(e.target.value)}
                title="Hingga tarikh"
                aria-label="Hingga tarikh"
                className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 outline-none focus:border-emerald-600"
              />
            </div>
            {(tapisNegeri || tapisJenis || tapisZon || tapisStatus || tapisDari || tapisHingga) && (
              <button
                onClick={() => {
                  setTapisParlimen('')
                  setTapisDun('')
                  setTapisNegeri('')
                  setTapisJenis('')
                  setTapisZon('')
                  setTapisStatus('')
                  setTapisDari('')
                  setTapisHingga('')
                }}
                className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
              >
                Kosongkan tapisan
              </button>
            )}
            {menjanaGraf && <span className="text-xs text-neutral-400">Mengemas kini graf...</span>}
          </div>
          {adaTapisKawasan && (
            <p className="pt-2 text-xs text-neutral-500">
              Hanya PPS yang telah ditetapkan Parlimen/ADUN dipaparkan. Bahagian Korban kekal mengikut negeri.
            </p>
          )}

          <div className="mt-4">
            <LaporanNasionalPreview
              items={itemsTertapis}
              ditutup={ditutupTertapis}
              korban={korbanTertapis}
              duaJam={dataGraf?.duaJam ?? []}
              harian={dataGraf?.harian ?? []}
              masaJana={previewData.masaJana}
            />
          </div>
        </DashboardCard>
      )}

      <Outlet />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
