import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FileText, FileClock, Home, ChevronRight, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PILIHAN = [
  {
    to: 'laporan-awal',
    jenis: 'awal' as const,
    label: 'Laporan Awal',
    desc: 'Laporan pertama sebaik sahaja kejadian dikenal pasti.',
    icon: FileText,
  },
  {
    to: 'laporan-semasa',
    jenis: 'semasa' as const,
    label: 'Laporan Semasa',
    desc: 'Kemas kini berterusan sepanjang tempoh operasi.',
    icon: FileClock,
  },
]

type Terkini = {
  file_name: string
  created_at: string
  url: string
}

async function muatTerkini(jenis: 'awal' | 'semasa'): Promise<Terkini | null> {
  const { data } = await supabase
    .from('laporan_awam')
    .select('file_name, file_path, created_at')
    .eq('jenis_laporan', jenis)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const { data: signed } = await supabase.storage
    .from('laporan-awam')
    .createSignedUrl(data.file_path, 3600)

  if (!signed) return null

  return { file_name: data.file_name, created_at: data.created_at, url: signed.signedUrl }
}

export function Sekretariat() {
  const location = useLocation()
  const onLanding = location.pathname === '/sekretariat'
  const [terkini, setTerkini] = useState<Record<'awal' | 'semasa', Terkini | null>>({
    awal: null,
    semasa: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!onLanding) return

    setLoading(true)
    Promise.all([muatTerkini('awal'), muatTerkini('semasa')]).then(([awal, semasa]) => {
      setTerkini({ awal, semasa })
      setLoading(false)
    })
  }, [onLanding])

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
          {PILIHAN.map(({ to, jenis, label, desc, icon: Icon }) => {
            const latest = terkini[jenis]
            return (
              <div
                key={to}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md"
              >
                <Link to={to} className="flex items-start gap-4 p-6 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2 className="font-medium text-neutral-900">{label}</h2>
                    <p className="mt-1 text-sm text-neutral-500">{desc}</p>
                  </div>
                </Link>

                {loading ? (
                  <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-6 pb-6 pt-3">
                    <div className="min-w-0 space-y-2">
                      <span className="block h-2.5 w-10 animate-pulse rounded-full bg-neutral-200" />
                      <span className="block h-3 w-32 animate-pulse rounded-full bg-neutral-200" />
                      <span className="block h-2.5 w-20 animate-pulse rounded-full bg-neutral-200" />
                    </div>
                    <span className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-neutral-200" />
                  </div>
                ) : latest ? (
                  <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-6 pb-6 pt-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Terkini</p>
                      <p className="truncate text-xs text-neutral-700">{latest.file_name}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(latest.created_at).toLocaleString('ms-MY')}
                      </p>
                    </div>
                    <a
                      href={latest.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      <Download size={13} />
                      Muat turun
                    </a>
                  </div>
                ) : (
                  <p className="px-6 pb-6 text-xs italic text-neutral-400">Tiada laporan lagi</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Outlet />
    </div>
  )
}
