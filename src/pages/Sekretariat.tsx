import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FileText, FileClock, FileDown, Home, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { DashboardCard } from '../components/DashboardCard'
import { useAuth } from '../hooks/useAuth'
import { ambilLaporanNasional } from '../lib/laporanNasional'
import { bangunLaporanNasionalDoc } from '../lib/janaLaporanNasional'
import type { jsPDF } from 'jspdf'

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

type BarisTerkini = {
  id: string
  created_at: string
  jenis_laporan: 'awal' | 'semasa'
  negeri: string | null
  daerah: string | null
  jenis_bencana: string | null
  nama_bencana: string | null
  level: string | null
  penyedia_nama: string | null
}

async function muatSepuluh(): Promise<BarisTerkini[]> {
  const { data } = await supabase
    .from('laporan_bencana')
    .select('id, created_at, jenis_laporan, negeri, daerah, jenis_bencana, nama_bencana, level, penyedia_nama')
    .order('created_at', { ascending: false })
    .limit(10)
  return (data as BarisTerkini[]) ?? []
}

const JENIS_BADGE: Record<'awal' | 'semasa', { label: string; className: string }> = {
  awal: { label: 'Laporan Awal', className: 'bg-sky-100 text-sky-700' },
  semasa: { label: 'Laporan Semasa', className: 'bg-amber-100 text-amber-700' },
}

export function Sekretariat() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const onLanding = location.pathname === '/sekretariat'
  const [toast, setToast] = useState<ToastState>(null)
  const [menjanaLaporan, setMenjanaLaporan] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewNamaFail, setPreviewNamaFail] = useState('')
  const docRef = useRef<jsPDF | null>(null)
  const [senarai, setSenarai] = useState<BarisTerkini[]>([])
  const [loadingSenarai, setLoadingSenarai] = useState(true)

  useEffect(() => {
    if (!onLanding) return

    muatSepuluh().then((rows) => {
      setSenarai(rows)
      setLoadingSenarai(false)
    })

    const channel = supabase
      .channel('sekretariat-terkini')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'laporan_bencana' }, (payload) => {
        const baru = payload.new as BarisTerkini
        setSenarai((prev) => (prev.some((r) => r.id === baru.id) ? prev : [baru, ...prev].slice(0, 10)))
        setToast({ type: 'success', message: 'Laporan baru diterima.' })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'laporan_bencana' }, () => {
        muatSepuluh().then(setSenarai)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onLanding])

  // Release the previewed PDF's blob URL whenever it's replaced or the page is left.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleJanaLaporanNasional() {
    setMenjanaLaporan(true)
    try {
      const items = await ambilLaporanNasional()
      if (items.length === 0) {
        setToast({ type: 'error', message: 'Tiada data untuk dijana.' })
        return
      }
      const { doc, namaFail } = await bangunLaporanNasionalDoc(items)
      docRef.current = doc
      setPreviewNamaFail(namaFail)
      setPreviewUrl(doc.output('bloburl') as unknown as string)
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana laporan. Sila cuba lagi.' })
    } finally {
      setMenjanaLaporan(false)
    }
  }

  function muatTurunLaporan() {
    docRef.current?.save(previewNamaFail)
  }

  function tutupPratonton() {
    setPreviewUrl(null)
    docRef.current = null
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

      {onLanding && profile?.role === 'pkop' && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleJanaLaporanNasional}
            disabled={menjanaLaporan}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            <FileDown size={15} />
            {menjanaLaporan ? 'Menjana...' : 'Jana Laporan Bencana Nasional'}
          </button>
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

      {onLanding && previewUrl && (
        <DashboardCard className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <h2 className="text-base font-semibold text-neutral-900">Pratonton Laporan Bencana Nasional</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={muatTurunLaporan}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
              >
                <FileDown size={15} />
                Muat Turun PDF
              </button>
              <button
                onClick={tutupPratonton}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Tutup
              </button>
            </div>
          </div>
          <iframe
            src={previewUrl}
            title="Pratonton Laporan Bencana Nasional"
            className="mt-4 h-[600px] w-full rounded-lg border border-neutral-200"
          />
        </DashboardCard>
      )}

      {onLanding && (
        <DashboardCard className="mt-6">
          <h2 className="text-base font-medium text-neutral-900">10 Laporan Terkini</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Masa Diterima</th>
                  <th className="py-2 pr-4 font-medium">Jenis</th>
                  <th className="py-2 pr-4 font-medium">Negeri</th>
                  <th className="py-2 pr-4 font-medium">Daerah</th>
                  <th className="py-2 pr-4 font-medium">Jenis Bencana</th>
                  <th className="py-2 pr-4 font-medium">Nama Bencana</th>
                  <th className="py-2 pr-4 font-medium">Level</th>
                  <th className="py-2 font-medium">Disediakan Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loadingSenarai ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={8} className="py-3">
                        <span className="block h-3 w-full animate-pulse rounded-full bg-neutral-200" />
                      </td>
                    </tr>
                  ))
                ) : senarai.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-sm italic text-neutral-400">
                      Tiada laporan lagi
                    </td>
                  </tr>
                ) : (
                  senarai.map((row) => {
                    const badge = JENIS_BADGE[row.jenis_laporan]
                    return (
                      <tr
                        key={row.id}
                        onClick={() =>
                          navigate(row.jenis_laporan === 'awal' ? '/sekretariat/laporan-awal' : '/sekretariat/laporan-semasa')
                        }
                        className="cursor-pointer transition-colors hover:bg-white/60"
                      >
                        <td className="whitespace-nowrap py-2.5 pr-4 text-neutral-600">
                          {new Date(row.created_at).toLocaleString('ms-MY')}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-800">{row.negeri || '—'}</td>
                        <td className="py-2.5 pr-4 text-neutral-800">{row.daerah || '—'}</td>
                        <td className="py-2.5 pr-4 text-neutral-800">{row.jenis_bencana || '—'}</td>
                        <td className="py-2.5 pr-4 text-neutral-800">{row.nama_bencana || '—'}</td>
                        <td className="py-2.5 pr-4 text-neutral-800">{row.level || '—'}</td>
                        <td className="py-2.5 text-neutral-800">{row.penyedia_nama || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      <Outlet />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
