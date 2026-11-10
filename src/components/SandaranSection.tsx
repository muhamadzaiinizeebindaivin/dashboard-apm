import { useCallback, useEffect, useState } from 'react'
import { Database, Download, Loader2, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { useAuth } from '../hooks/useAuth'
import { adaKunciSandaran, eksportSandaran } from '../lib/eksportSandaran'
import type { ToastState } from './Toast'

type LogSandaran = { masa: string; nama: string | null; bil_baris: number }

const formatMasa = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Admin (PKOP): download every table as one Excel file, with the last download shown
export function SandaranSection({ onToast }: { onToast: (t: ToastState) => void }) {
  const { profile } = useAuth()
  const [akhir, setAkhir] = useState<LogSandaran | null>(null)
  const [memuat, setMemuat] = useState(false)

  const muatLog = useCallback(async () => {
    const { data } = await supabase
      .from('log_sandaran')
      .select('masa, nama, bil_baris')
      .order('masa', { ascending: false })
      .limit(1)
      .maybeSingle()
    setAkhir((data as LogSandaran | null) ?? null)
  }, [])

  useEffect(() => {
    muatLog()
  }, [muatLog])
  useRealtime('log-sandaran', [{ jadual: 'log_sandaran', peristiwa: 'INSERT' }], muatLog)

  async function muatTurun() {
    setMemuat(true)
    try {
      const { bilJadual, bilBaris } = await eksportSandaran(profile?.full_name)
      onToast({
        type: 'success',
        message: `Sandaran tersulit dimuat turun: ${bilJadual} jadual, ${bilBaris.toLocaleString('ms-MY')} baris.`,
      })
      muatLog()
    } catch (e) {
      onToast({ type: 'error', message: e instanceof Error ? e.message : 'Gagal memuat turun sandaran.' })
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/60 bg-white/40 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <Database size={18} className="text-emerald-700" />
            Sandaran Data
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Salinan semua data sistem dalam satu fail Excel tersulit (.xlsx.age). Hanya pemegang kunci boleh
            membukanya.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {akhir
              ? `Muat turun terakhir: ${formatMasa(akhir.masa)} oleh ${akhir.nama || 'pengguna tidak diketahui'}`
              : 'Belum pernah dimuat turun.'}
          </p>
        </div>

        <button
          onClick={muatTurun}
          disabled={memuat || !adaKunciSandaran}
          title={adaKunciSandaran ? undefined : 'Kunci sandaran belum ditetapkan'}
          className="flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {memuat ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {memuat ? 'Menyediakan…' : 'Muat Turun Sandaran'}
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        Fail ini mengandungi data peribadi (mangsa, nombor telefon, akaun pengguna) dan disulitkan dengan age.
        Tanpa kunci peribadi, kandungannya tidak boleh dibaca walaupun fail tersebar.
      </p>
    </div>
  )
}