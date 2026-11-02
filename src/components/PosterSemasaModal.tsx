import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, FileDown, ImageDown, Loader2, Mail, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { kumpulanNegeri } from '../lib/kumpulanNegeri'
import { keNilaiTempatan } from '../lib/tarikhBebas'
import { lukisPosterInsiden, muatTurunPosterPdf, muatTurunPosterPng, posterPdfBase64 } from '../lib/posterInsiden'
import type { DataPoster } from '../lib/posterInsiden'
import type { LaporanBencanaRow } from '../lib/laporanBencana'

// Laporan Semasa → "Maklumat Semasa Insiden" poster. Fields are pre-filled from the report
// and can be corrected before downloading (PNG / PDF) or e-mailing it to the PKON (PKOP only).
// Negeri is fixed: it decides who receives the e-mail (the server reads it from the report).

type Props = {
  laporan: LaporanBencanaRow | null
  onClose: () => void
  onEmelDihantar: (id: string, bil: number) => void
}

type Nilai = {
  tarikh_masa: string // datetime-local
  ringkasan: string
  tempat: string
  daerah: string
  sumber_laporan: string
}

type Tindakan = 'png' | 'pdf' | 'emel'

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

function tarikhSah(v: string | null | undefined) {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function nilaiAwal(r: LaporanBencanaRow): Nilai {
  const tarikh = tarikhSah(r.tarikh_masa) ?? new Date(r.created_at)
  return {
    tarikh_masa: keNilaiTempatan(tarikh),
    ringkasan: r.kandungan?.trim() || [r.jenis_bencana, r.nama_bencana].filter(Boolean).join(' – '),
    tempat: r.daerah?.trim() || r.nama_bencana?.trim() || '',
    daerah: r.daerah?.trim() ?? '',
    sumber_laporan: '',
  }
}

async function mesejFungsi(error: { message: string; context?: { json?: () => Promise<unknown> } }) {
  const body = (await error.context?.json?.().catch(() => null)) as { error?: string } | null
  return body?.error ?? error.message
}

const masaPenuh = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

export function PosterSemasaModal({ laporan, onClose, onEmelDihantar }: Props) {
  const { profile } = useAuth()
  const bolehEmel = profile?.role === 'pkop'
  const [nilai, setNilai] = useState<Nilai | null>(null)
  const [pratonton, setPratonton] = useState('')
  const [sedang, setSedang] = useState<Tindakan | null>(null)
  const [sahkanEmel, setSahkanEmel] = useState(false)
  const [ralat, setRalat] = useState('')

  // Fresh values each time a report is opened
  useEffect(() => {
    if (!laporan) return
    setNilai(nilaiAwal(laporan))
    setPratonton('')
    setSahkanEmel(false)
    setRalat('')
  }, [laporan])

  const negeri = laporan?.negeri ?? ''
  const data: DataPoster | null =
    nilai && tarikhSah(nilai.tarikh_masa)
      ? {
          tarikh_masa: new Date(nilai.tarikh_masa).toISOString(),
          ringkasan: nilai.ringkasan.trim(),
          tempat: nilai.tempat.trim(),
          daerah: nilai.daerah.trim(),
          negeri,
          sumber_laporan: nilai.sumber_laporan.trim(),
        }
      : null
  const lengkap = !!data && !!data.ringkasan && !!data.tempat && !!data.daerah && !!data.negeri
  const kunciPratonton = data ? JSON.stringify(data) : ''

  // Live preview, redrawn 400 ms after the last keystroke
  useEffect(() => {
    if (!laporan || !data) return
    let batal = false
    const t = setTimeout(async () => {
      try {
        // Preview only: half size is plenty on screen and much faster to redraw
        const kanvas = await lukisPosterInsiden(data, 'semasa', 0.5)
        if (!batal) setPratonton(kanvas.toDataURL('image/jpeg', 0.7))
      } catch {
        // preview only: the download buttons report their own errors
      }
    }, 400)
    return () => {
      batal = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciPratonton, laporan])

  async function muatTurun(jenis: 'png' | 'pdf') {
    if (!data || !lengkap) return
    setRalat('')
    setSedang(jenis)
    try {
      if (jenis === 'png') await muatTurunPosterPng(data, 'semasa')
      else await muatTurunPosterPdf(data, 'semasa')
    } catch {
      setRalat(`Gagal menjana ${jenis === 'png' ? 'poster' : 'PDF'}. Sila cuba lagi.`)
    } finally {
      setSedang(null)
    }
  }

  async function hantarEmel() {
    if (!laporan || !data || !lengkap) return
    setRalat('')
    setSedang('emel')
    try {
      const { base64, namaFail } = await posterPdfBase64(data, 'semasa')
      const { data: hasil, error } = await supabase.functions.invoke('emel-insiden', {
        body: {
          jenis: 'semasa',
          laporan_id: laporan.id,
          pdf_base64: base64,
          nama_fail: namaFail,
          maklumat: {
            tarikh_masa: data.tarikh_masa,
            ringkasan: data.ringkasan,
            tempat: data.tempat,
            daerah: data.daerah,
          },
        },
      })
      if (error) {
        // Dead login session: back to the login page (same as Laporan Insiden)
        if ((error as { context?: { status?: number } }).context?.status === 401) {
          onClose()
          await supabase.auth.signOut({ scope: 'local' })
          return
        }
        setRalat(await mesejFungsi(error))
        return
      }
      setSahkanEmel(false)
      onEmelDihantar(laporan.id, (hasil as { bil?: number } | null)?.bil ?? 0)
    } catch {
      setRalat('Gagal menjana PDF untuk lampiran. Sila cuba lagi.')
    } finally {
      setSedang(null)
    }
  }

  const ubah = (k: keyof Nilai) => (e: { target: { value: string } }) =>
    nilai && setNilai({ ...nilai, [k]: e.target.value })

  const kelasButang =
    'flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60'

  return createPortal(
    <AnimatePresence>
      {laporan && nilai && (
        <motion.div
          key="latar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1350] flex items-center justify-center bg-black/30 px-4 py-8"
          onClick={() => !sedang && onClose()}
        >
          {/* Same entrance as ConfirmModal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tajuk-poster-semasa"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="tajuk-poster-semasa" className="text-lg font-semibold text-neutral-900">
                  Poster Maklumat Semasa
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Diisi daripada laporan ini. Semak dan betulkan sebelum muat turun atau emel.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={!!sedang}
                aria-label="Tutup"
                className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Tarikh & Masa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={nilai.tarikh_masa}
                    onChange={ubah('tarikh_masa')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Insiden <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={4} value={nilai.ringkasan} onChange={ubah('ringkasan')} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <input value={nilai.tempat} onChange={ubah('tempat')} className={inputClass} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Daerah <span className="text-red-500">*</span>
                    </label>
                    <input value={nilai.daerah} onChange={ubah('daerah')} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">Negeri</label>
                    {/* Fixed: the e-mail goes to the PKON of the report's state */}
                    <input value={negeri} disabled className={`${inputClass} bg-neutral-50 text-neutral-500`} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Sumber <span className="text-xs font-normal text-neutral-400">(pilihan)</span>
                  </label>
                  <input value={nilai.sumber_laporan} onChange={ubah('sumber_laporan')} className={inputClass} />
                </div>
              </div>

              <div className="flex items-start justify-center">
                {pratonton ? (
                  <img
                    src={pratonton}
                    alt="Pratonton poster"
                    className="w-full max-w-[260px] rounded-lg border border-neutral-200 shadow-md"
                  />
                ) : (
                  <div className="flex aspect-[1240/1754] w-full max-w-[260px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
                    {data ? <Loader2 size={18} className="animate-spin" /> : 'Tarikh tidak sah'}
                  </div>
                )}
              </div>
            </div>

            {laporan.emel_dihantar_pada && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 size={14} className="shrink-0" />
                Emel telah dihantar pada {masaPenuh(laporan.emel_dihantar_pada)}
              </p>
            )}

            {sahkanEmel && (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Hantar Maklumat Semasa Insiden kepada semua akaun PKON {kumpulanNegeri(negeri)} yang aktif? Poster
                PDF akan dilampirkan.
                {laporan.emel_dihantar_pada && ' Emel untuk laporan ini telah pun dihantar sebelum ini.'}
              </div>
            )}

            {ralat && <p className="mt-4 text-sm text-red-600">{ralat}</p>}
            {!lengkap && (
              <p className="mt-4 text-xs text-neutral-500">Lengkapkan semua medan bertanda * untuk menjana poster.</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {sahkanEmel ? (
                <>
                  <button type="button" onClick={() => setSahkanEmel(false)} disabled={!!sedang} className={kelasButang}>
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={hantarEmel}
                    disabled={!!sedang || !lengkap}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 disabled:opacity-70"
                  >
                    {sedang === 'emel' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                    {sedang === 'emel' ? 'Menghantar...' : 'Hantar Emel'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => muatTurun('png')}
                    disabled={!!sedang || !lengkap}
                    className={kelasButang}
                  >
                    {sedang === 'png' ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
                    Muat Turun PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => muatTurun('pdf')}
                    disabled={!!sedang || !lengkap}
                    className={kelasButang}
                  >
                    {sedang === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                    Muat Turun PDF
                  </button>
                  {bolehEmel && (
                    <button
                      type="button"
                      onClick={() => setSahkanEmel(true)}
                      disabled={!!sedang || !lengkap}
                      className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 disabled:opacity-70"
                    >
                      <Mail size={15} />
                      {laporan.emel_dihantar_pada ? 'Hantar Semula Emel' : 'Emel ke PKON'}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
