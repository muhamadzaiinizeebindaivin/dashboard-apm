import { useEffect, useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { supabase } from '../lib/supabase'

type LaporanRow = {
  id: string
  file_path: string
  file_name: string
  created_at: string
}

type SenaraiLaporanAwamProps = {
  jenis: 'awal' | 'semasa'
  tajuk: string
}

export function SenaraiLaporanAwam({ jenis, tajuk }: SenaraiLaporanAwamProps) {
  const [rows, setRows] = useState<LaporanRow[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function muatSemula() {
      setLoading(true)
      const { data } = await supabase
        .from('laporan_awam')
        .select('id, file_path, file_name, created_at')
        .eq('jenis_laporan', jenis)
        .order('created_at', { ascending: false })

      const list = (data as LaporanRow[]) ?? []
      setRows(list)

      const entries = await Promise.all(
        list.map(async (row) => {
          const { data: signed, error } = await supabase.storage
            .from('laporan-awam')
            .createSignedUrl(row.file_path, 3600)
          if (error) {
            console.error(`Gagal jana pautan untuk ${row.file_name} (${row.file_path}):`, error)
          }
          return [row.id, signed?.signedUrl ?? ''] as const
        }),
      )
      setUrls(Object.fromEntries(entries))
      setLoading(false)
    }

    muatSemula()
  }, [jenis])

  return (
    <DashboardCard className="mt-6">
      <h2 className="text-base font-medium text-neutral-900">{tajuk}</h2>

      {loading ? (
        <p className="mt-2 text-sm text-neutral-400">Memuatkan...</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Tiada laporan dimuat naik lagi.</p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={18} className="shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-800">{row.file_name}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(row.created_at).toLocaleString('ms-MY')}
                  </p>
                </div>
              </div>

              {urls[row.id] && (
                <a
                  href={urls[row.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                >
                  <Download size={14} />
                  Muat turun
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
