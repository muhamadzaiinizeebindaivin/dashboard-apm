import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, Trash2, Home, ChevronRight, ArrowLeft } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { ConfirmModal } from './ConfirmModal'
import { Toast } from './Toast'
import type { ToastState } from './Toast'
import { supabase } from '../lib/supabase'

type LaporanRow = {
  id: string
  file_path: string
  file_name: string
  created_at: string
}

type SenaraiLaporanAwamProps = {
  jenis: 'awal' | 'semasa'
  label: string
}

export function SenaraiLaporanAwam({ jenis, label }: SenaraiLaporanAwamProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LaporanRow[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<LaporanRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const muatSemula = useCallback(async () => {
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
  }, [jenis])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleteError('')
    setDeleting(true)

    await supabase.storage.from('laporan-awam').remove([pendingDelete.file_path])
    const { error } = await supabase.from('laporan_awam').delete().eq('id', pendingDelete.id)
    setDeleting(false)

    if (error) {
      setDeleteError('Gagal memadam. Sila cuba lagi.')
      return
    }

    const id = pendingDelete.id
    setPendingDelete(null)
    setToast({ type: 'success', message: 'Laporan berjaya dipadam.' })

    setFadingId(id)
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => r.id !== id))
      setFadingId(null)
    }, 300)
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-emerald-700"
            >
              <Home size={13} />
              Portal
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <button
              onClick={() => navigate('/sekretariat')}
              className="text-neutral-400 transition-colors hover:text-emerald-700"
            >
              Sekretariat
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">{label}</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{label}</h1>
        </div>

        <button
          onClick={() => navigate('/sekretariat')}
          className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>

      <DashboardCard className="mt-6">
        <h2 className="text-base font-medium text-neutral-900">Fail Dimuat Naik</h2>

        {loading ? (
          <ul className="mt-4 divide-y divide-neutral-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-neutral-200" />
                  <div className="min-w-0 space-y-1.5">
                    <span className="block h-3 w-40 animate-pulse rounded-full bg-neutral-200" />
                    <span className="block h-2.5 w-24 animate-pulse rounded-full bg-neutral-200" />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="h-7 w-24 animate-pulse rounded-full bg-neutral-200" />
                  <span className="h-7 w-7 animate-pulse rounded-full bg-neutral-200" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Tiada laporan dimuat naik lagi.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`flex items-center justify-between gap-3 py-3 transition-all duration-300 ${
                  fadingId === row.id ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={18} className="shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-800">{row.file_name}</p>
                    <p className="text-xs text-neutral-400">
                      {new Date(row.created_at).toLocaleString('ms-MY')}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {urls[row.id] && (
                    <a
                      href={urls[row.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      <Download size={14} />
                      Muat turun
                    </a>
                  )}
                  <button
                    onClick={() => setPendingDelete(row)}
                    title="Padam"
                    className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <ConfirmModal
        open={!!pendingDelete}
        title="Padam Laporan"
        message={`Padam fail "${pendingDelete?.file_name}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null)
          setDeleteError('')
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
