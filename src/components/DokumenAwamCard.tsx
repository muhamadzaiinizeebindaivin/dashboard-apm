import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, Download, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Toast } from './Toast'
import type { ToastState } from './Toast'

type Jenis = 'manual_pengguna' | 'format_laporan_awal' | 'format_laporan_semasa'

const SUSUNAN: Jenis[] = ['manual_pengguna', 'format_laporan_awal', 'format_laporan_semasa']

// `terima`: file types suggested in the file picker (others are still allowed)
const META: Record<Jenis, { label: string; desc: string; terima: string }> = {
  manual_pengguna: {
    label: 'Manual Pengguna',
    desc: 'Panduan penggunaan sistem untuk kakitangan dan NGO.',
    terima: '.pdf,.doc,.docx',
  },
  format_laporan_awal: {
    label: 'Format Kosong Laporan Awal',
    desc: 'Templat Word rasmi Laporan Awal NDCC.',
    terima: '.docx,.doc',
  },
  format_laporan_semasa: {
    label: 'Format Kosong Laporan Semasa',
    desc: 'Templat Excel rasmi Laporan Situasi Bencana.',
    terima: '.xlsx,.xls',
  },
}

const KOSONG: Record<Jenis, DokumenRow | null> = {
  manual_pengguna: null,
  format_laporan_awal: null,
  format_laporan_semasa: null,
}

type DokumenRow = {
  jenis: Jenis
  file_name: string
  file_path: string
}

export function DokumenAwamCard() {
  const { profile } = useAuth()
  const bolehMuatNaik = profile?.role === 'pkop' || profile?.role === 'pkon'

  const [dokumen, setDokumen] = useState<Record<Jenis, DokumenRow | null>>(KOSONG)
  const [memuatNaik, setMemuatNaik] = useState<Jenis | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const inputRefs = useRef<Record<Jenis, HTMLInputElement | null>>({
    manual_pengguna: null,
    format_laporan_awal: null,
    format_laporan_semasa: null,
  })

  async function muatSemula() {
    const { data, error } = await supabase.from('dokumen_awam').select('jenis, file_name, file_path')
    if (error) return // public homepage card: keep what is shown, no message
    const next: Record<Jenis, DokumenRow | null> = { ...KOSONG }
    for (const row of (data as DokumenRow[]) ?? []) {
      if (row.jenis in next) next[row.jenis] = row
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SUSUNAN.map((jenis) => {
        const row = dokumen[jenis]
        const sedangMuatNaik = memuatNaik === jenis

        return (
          <div
            key={jenis}
            className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-5 shadow-lg"
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
                      accept={META[jenis].terima}
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
                      className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                    >
                      {sedangMuatNaik ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      {sedangMuatNaik ? 'Memuat naik...' : row ? 'Ganti Fail' : 'Muat Naik'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}