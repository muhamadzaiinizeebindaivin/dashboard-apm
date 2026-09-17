import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Upload, Download, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Toast } from './Toast'
import type { ToastState } from './Toast'

type Jenis = 'manual_pengguna' | 'format_laporan'

const META: Record<Jenis, { label: string; desc: string }> = {
  manual_pengguna: {
    label: 'Manual Pengguna',
    desc: 'Panduan penggunaan sistem untuk kakitangan dan NGO.',
  },
  format_laporan: {
    label: 'Format Kosong Laporan',
    desc: 'Templat rasmi untuk laporan awal dan laporan semasa.',
  },
}

type DokumenRow = {
  jenis: Jenis
  file_name: string
  file_path: string
}

export function DokumenAwamCard() {
  const { profile } = useAuth()
  const bolehMuatNaik = profile?.role === 'pkop' || profile?.role === 'pkon'

  const [dokumen, setDokumen] = useState<Record<Jenis, DokumenRow | null>>({
    manual_pengguna: null,
    format_laporan: null,
  })
  const [memuatNaik, setMemuatNaik] = useState<Jenis | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const inputRefs = useRef<Record<Jenis, HTMLInputElement | null>>({
    manual_pengguna: null,
    format_laporan: null,
  })

  async function muatSemula() {
    const { data } = await supabase.from('dokumen_awam').select('jenis, file_name, file_path')
    const next: Record<Jenis, DokumenRow | null> = { manual_pengguna: null, format_laporan: null }
    for (const row of (data as DokumenRow[]) ?? []) {
      next[row.jenis] = row
    }
    setDokumen(next)
  }

  useEffect(() => {
    muatSemula()
  }, [])

  function bukaFail(jenis: Jenis) {
    const row = dokumen[jenis]
    if (!row) return
    const { data } = supabase.storage.from('dokumen-awam').getPublicUrl(row.file_path)
    window.open(data.publicUrl, '_blank')
  }

  async function gantiFail(jenis: Jenis, file: File) {
    setMemuatNaik(jenis)

    const sedia = dokumen[jenis]
    if (sedia) {
      await supabase.storage.from('dokumen-awam').remove([sedia.file_path])
    }

    const filePath = `${jenis}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('dokumen-awam').upload(filePath, file)

    if (uploadError) {
      setMemuatNaik(null)
      setToast({ type: 'error', message: 'Gagal memuat naik fail. Sila cuba lagi.' })
      return
    }

    await supabase.from('dokumen_awam').upsert({
      jenis,
      file_name: file.name,
      file_path: filePath,
    })

    setMemuatNaik(null)
    setToast({ type: 'success', message: `${META[jenis].label} berjaya dimuat naik.` })
    muatSemula()
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(['manual_pengguna', 'format_laporan'] as Jenis[]).map((jenis, i) => {
        const row = dokumen[jenis]
        const sedangMuatNaik = memuatNaik === jenis

        return (
          <motion.div
            key={jenis}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.2 } }}
            whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-white/60 bg-white/40 p-5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  row ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                <FileText size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900">{META[jenis].label}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{META[jenis].desc}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-3">
              {row ? (
                <span className="truncate text-xs text-neutral-400" title={row.file_name}>
                  {row.file_name}
                </span>
              ) : (
                <span className="text-xs italic text-neutral-400">Belum dimuat naik</span>
              )}

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => bukaFail(jenis)}
                  disabled={!row}
                  title="Muat turun"
                  className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-default disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  <Download size={13} />
                  Muat Turun
                </button>

                {bolehMuatNaik && (
                  <>
                    <input
                      ref={(el) => {
                        inputRefs.current[jenis] = el
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) gantiFail(jenis, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => inputRefs.current[jenis]?.click()}
                      disabled={sedangMuatNaik}
                      title={row ? 'Ganti fail' : 'Muat naik fail'}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-60"
                    >
                      {sedangMuatNaik ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}