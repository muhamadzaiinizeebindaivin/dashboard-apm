import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FileText, FileClock, FileDown, Home, ChevronRight } from 'lucide-react'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { DashboardCard } from '../components/DashboardCard'
import { LaporanNasionalPreview } from '../components/LaporanNasionalPreview'
import { useAuth } from '../hooks/useAuth'
import { ambilLaporanNasional } from '../lib/laporanNasional'
import type { ItemLaporanNasional } from '../lib/laporanNasional'
import { ambilDataGraf } from '../lib/laporanNasionalGraf'
import type { TitikGraf } from '../lib/laporanNasionalGraf'
import { bangunLaporanNasionalDoc } from '../lib/janaLaporanNasional'
import { JENIS_BENCANA_SEMASA } from '../lib/laporanBencana'
import { NEGERI_LIST } from '../lib/negeriVisual'

const ZON_LIST = ['Utara', 'Tengah', 'Selatan', 'Timur', 'Borneo']

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
]

export function Sekretariat() {
  const location = useLocation()
  const { profile } = useAuth()
  const onLanding = location.pathname === '/sekretariat'
  const [toast, setToast] = useState<ToastState>(null)
  const [menjanaLaporan, setMenjanaLaporan] = useState(false)
  const [menMuatTurun, setMenMuatTurun] = useState(false)
  const [menjanaGraf, setMenjanaGraf] = useState(false)
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [tapisJenis, setTapisJenis] = useState('')
  const [tapisZon, setTapisZon] = useState('')
  const [previewData, setPreviewData] = useState<{ items: ItemLaporanNasional[]; masaJana: Date } | null>(null)
  const [dataGraf, setDataGraf] = useState<{ duaJam: TitikGraf[]; harian: TitikGraf[] } | null>(null)

  // Load the national report's content automatically as soon as the page opens.
  useEffect(() => {
    if (onLanding && profile?.role === 'pkop') {
      handleJanaLaporanNasional()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLanding, profile?.role])

  async function handleJanaLaporanNasional() {
    setMenjanaLaporan(true)
    try {
      const items = await ambilLaporanNasional()
      if (items.length === 0) {
        setToast({ type: 'error', message: 'Tiada data untuk dijana.' })
        return
      }
      setPreviewData({ items, masaJana: new Date() })
      setTapisNegeri('')
      setTapisJenis('')
      setTapisZon('')
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
      .finally(() => {
        if (!dibatalkan) setMenjanaGraf(false)
      })
    return () => {
      dibatalkan = true
    }
  }, [previewData, tapisNegeri, tapisJenis, tapisZon])

  const itemsTertapis = previewData
    ? previewData.items.filter(
        (i) =>
          (!tapisNegeri || i.negeri === tapisNegeri) &&
          (!tapisJenis || i.jenisBencana === tapisJenis) &&
          (!tapisZon || i.zon === tapisZon),
      )
    : []

  async function muatTurunLaporan() {
    if (!previewData) return
    setMenMuatTurun(true)
    try {
      const { doc, namaFail } = await bangunLaporanNasionalDoc(itemsTertapis)
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
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <h2 className="font-medium text-neutral-900">{label}</h2>
                <p className="mt-1 text-sm text-neutral-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {onLanding && previewData && (
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
              onChange={(e) => setTapisNegeri(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Negeri</option>
              {NEGERI_LIST.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={tapisJenis}
              onChange={(e) => setTapisJenis(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua Jenis Bencana</option>
              {JENIS_BENCANA_SEMASA.map((j) => (
                <option key={j} value={j}>
                  {j}
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
            {(tapisNegeri || tapisJenis || tapisZon) && (
              <button
                onClick={() => {
                  setTapisNegeri('')
                  setTapisJenis('')
                  setTapisZon('')
                }}
                className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
              >
                Kosongkan tapisan
              </button>
            )}
            {menjanaGraf && <span className="text-xs text-neutral-400">Mengemas kini graf...</span>}
          </div>

          <div className="mt-4">
            <LaporanNasionalPreview
              items={itemsTertapis}
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
