import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { keNilaiTempatan } from '../lib/tarikhBebas'
import { kemasNamaTempat, normalNamaBencana } from '../lib/normalisasi'
import type { LaporanInsidenRow } from '../pages/LaporanInsiden'

// PKOP: correct a Laporan Insiden (same fields and rules as the PKOD form)

type Props = {
  insiden: LaporanInsidenRow | null
  onClose: () => void
  onSaved: () => void
}

type Nilai = {
  tarikh_masa: string
  ringkasan: string
  tempat: string
  daerah: string
  negeri: string
  sumber_laporan: string
}

const MEDAN: { key: keyof Nilai; label: string; jenis?: 'datetime' | 'textarea' | 'negeri'; lebar?: boolean }[] = [
  { key: 'tarikh_masa', label: 'Tarikh & Masa Berlaku', jenis: 'datetime' },
  { key: 'sumber_laporan', label: 'Sumber Laporan' },
  { key: 'ringkasan', label: 'Ringkasan Insiden', jenis: 'textarea', lebar: true },
  { key: 'tempat', label: 'Lokasi (Tempat)', lebar: true },
  { key: 'daerah', label: 'Daerah' },
  { key: 'negeri', label: 'Negeri', jenis: 'negeri' },
]

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

export function EditInsidenModal({ insiden, onClose, onSaved }: Props) {
  const [nilai, setNilai] = useState<Nilai | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  // Keeps the last insiden while the modal animates out (insiden is already null then)
  const terakhir = useRef<LaporanInsidenRow | null>(null)
  if (insiden) terakhir.current = insiden
  const papar = insiden ?? terakhir.current

  useEffect(() => {
    if (!insiden) return // closing: keep the values on screen during the exit animation
    setRalat('')
    setNilai({
      tarikh_masa: keNilaiTempatan(new Date(insiden.tarikh_masa)),
      ringkasan: insiden.ringkasan,
      tempat: insiden.tempat,
      daerah: insiden.daerah,
      negeri: insiden.negeri,
      sumber_laporan: insiden.sumber_laporan,
    })
  }, [insiden])

  async function simpan() {
    if (!insiden || !nilai || menyimpan) return
    setRalat('')
    const kosong = MEDAN.find((m) => !nilai[m.key].trim())
    if (kosong) {
      setRalat(`Sila isi ruangan "${kosong.label}".`)
      return
    }
    const masa = new Date(nilai.tarikh_masa)
    if (Number.isNaN(masa.getTime())) {
      setRalat('Tarikh & Masa Berlaku tidak sah.')
      return
    }

    setMenyimpan(true)
    const { error } = await supabase.rpc('kemaskini_laporan_insiden', {
      p_id: insiden.id,
      p_data: {
        tarikh_masa: masa.toISOString(),
        ringkasan: normalNamaBencana(nilai.ringkasan),
        tempat: normalNamaBencana(nilai.tempat),
        daerah: kemasNamaTempat(nilai.daerah),
        negeri: nilai.negeri,
        sumber_laporan: normalNamaBencana(nilai.sumber_laporan),
      },
    })
    setMenyimpan(false)
    if (error) {
      setRalat(error.code === 'P0002' ? 'Laporan insiden ini telah dipadam.' : 'Gagal menyimpan. Sila cuba lagi.')
      return
    }
    onSaved()
  }

  return createPortal(
    <AnimatePresence>
      {insiden && papar && nilai && (
        <motion.div
          key="latar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1350] flex items-center justify-center bg-black/30 px-4 py-8"
          onClick={() => !menyimpan && onClose()}
        >
          {/* Same entrance as ConfirmModal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tajuk-edit-insiden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="tajuk-edit-insiden" className="text-lg font-semibold text-neutral-900">
                Edit Laporan Insiden
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={menyimpan}
                aria-label="Tutup"
                className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            {papar.emel_dihantar_pada && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Emel telah dihantar kepada PKON dengan maklumat lama. Selepas menyimpan, gunakan "Hantar Semula Emel"
                jika PKON perlu menerima versi terkini.
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {MEDAN.map((m) => (
                <div key={m.key} className={m.lebar ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    {m.label} <span className="text-red-500">*</span>
                  </label>
                  {m.jenis === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={nilai[m.key]}
                      onChange={(e) => setNilai({ ...nilai, [m.key]: e.target.value })}
                      className={inputClass}
                    />
                  ) : m.jenis === 'negeri' ? (
                    <select
                      value={nilai.negeri}
                      onChange={(e) => setNilai({ ...nilai, negeri: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— Pilih —</option>
                      {NEGERI_LIST.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={m.jenis === 'datetime' ? 'datetime-local' : 'text'}
                      value={nilai[m.key]}
                      onChange={(e) => setNilai({ ...nilai, [m.key]: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}
            </div>

            {ralat && <p className="mt-4 text-sm text-red-600">{ralat}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={menyimpan}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={simpan}
                disabled={menyimpan}
                className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 disabled:opacity-70"
              >
                {menyimpan && <Loader2 size={15} className="animate-spin" />}
                {menyimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
