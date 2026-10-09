import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, FileDown, RefreshCw, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { NEGERI_LIST } from '../lib/negeriVisual'
import {
  ambilLogKeadaan,
  ambilRekodParas,
  ambilSemuaRekodParas,
  formatJam,
  formatMasa,
  formatTempoh,
  KEADAAN_LABEL,
  statusRekod,
  STATUS_REKOD_LABEL,
  TAPIS_KOSONG,
  teksTamat,
} from '../lib/rekodParas'
import type { LogKeadaan, RekodParas, TapisRekodParas } from '../lib/rekodParas'
import { janaRekodParas } from '../lib/janaRekodParas'
import { Memuat, SkeletonKad } from './Memuatkan'

const SAIZ_HALAMAN = 10

const inputClass =
  'h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

type RekodParasPanelProps = {
  open: boolean
  onClose: () => void
}

export function RekodParasPanel({ open, onClose }: RekodParasPanelProps) {
  const [tapis, setTapis] = useState<TapisRekodParas>(TAPIS_KOSONG)
  const [carianInput, setCarianInput] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [rows, setRows] = useState<RekodParas[]>([])
  const [log, setLog] = useState<Record<string, LogKeadaan[]>>({})
  const [jumlah, setJumlah] = useState(0)
  const [loading, setLoading] = useState(false)
  const [ralat, setRalat] = useState('')
  const [mengeksport, setMengeksport] = useState(false)
  const [kunciMuat, setKunciMuat] = useState(0)

  // Debounce the search box so we don't query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setTapis((p) => (p.carian === carianInput ? p : { ...p, carian: carianInput }))
      setHalaman(1)
    }, 300)
    return () => clearTimeout(t)
  }, [carianInput])

  function tukarTapis<K extends keyof TapisRekodParas>(kunci: K, nilai: TapisRekodParas[K]) {
    setTapis((p) => ({ ...p, [kunci]: nilai }))
    setHalaman(1)
  }

  function kosongkan() {
    setCarianInput('')
    setTapis(TAPIS_KOSONG)
    setHalaman(1)
  }

  useEffect(() => {
    if (!open) return
    let batal = false
    setLoading(true)
    setRalat('')

    const mula = (halaman - 1) * SAIZ_HALAMAN
    ambilRekodParas(tapis, mula, mula + SAIZ_HALAMAN - 1)
      .then(async ({ rows, count }) => {
        const peta = await ambilLogKeadaan(rows.map((r) => r.id))
        if (batal) return
        setRows(rows)
        setJumlah(count)
        setLog(peta)
      })
      .catch(() => {
        if (!batal) setRalat('Gagal memuatkan rekod. Sila cuba lagi.')
      })
      .finally(() => {
        if (!batal) setLoading(false)
      })

    return () => {
      batal = true
    }
  }, [open, tapis, halaman, kunciMuat])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [open, onClose])

  async function eksport() {
    setMengeksport(true)
    setRalat('')
    try {
      const semua = await ambilSemuaRekodParas(tapis)
      if (semua.length === 0) {
        setRalat('Tiada rekod untuk dieksport.')
        return
      }
      const peta = await ambilLogKeadaan(semua.map((r) => r.id))
      await janaRekodParas(semua, peta, tapis)
    } catch {
      setRalat('Gagal menjana PDF. Sila cuba lagi.')
    } finally {
      setMengeksport(false)
    }
  }

  const jumlahHalaman = Math.max(1, Math.ceil(jumlah / SAIZ_HALAMAN))
  const adaTapisan = !!(carianInput || tapis.negeri || tapis.status || tapis.keadaan || tapis.dari || tapis.hingga)

  // Portal to <body> so no ancestor (backdrop-filter, transform...) can trap
  // the fixed panel inside its own stacking context.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* z-index above Leaflet's controls (1000) */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1200] bg-black/30"
          />

          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-[1201] flex w-full max-w-2xl flex-col bg-white/95 shadow-2xl backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Rekod PARAS</h2>
                <p className="text-xs text-neutral-500">{jumlah} rekod</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setKunciMuat((k) => k + 1)}
                  disabled={loading}
                  title="Muat semula"
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={eksport}
                  disabled={mengeksport || jumlah === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <FileDown size={15} />
                  {mengeksport ? 'Menjana...' : 'Eksport PDF'}
                </button>
                <button
                  onClick={onClose}
                  title="Tutup"
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-2 border-b border-neutral-100 px-5 py-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={carianInput}
                  onChange={(e) => setCarianInput(e.target.value)}
                  placeholder="Cari nama atau no. tel..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <select value={tapis.negeri} onChange={(e) => tukarTapis('negeri', e.target.value)} className={inputClass}>
                  <option value="">Semua Negeri</option>
                  {NEGERI_LIST.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>

                <select
                  value={tapis.status}
                  onChange={(e) => tukarTapis('status', e.target.value as TapisRekodParas['status'])}
                  className={inputClass}
                >
                  <option value="">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="tamat">Tamat</option>
                </select>

                <select
                  value={tapis.keadaan}
                  onChange={(e) => tukarTapis('keadaan', e.target.value as TapisRekodParas['keadaan'])}
                  className={inputClass}
                >
                  <option value="">Semua Keadaan</option>
                  <option value="rehat">Pernah Rehat</option>
                  <option value="kecemasan">Pernah Kecemasan</option>
                </select>

                <label className="text-xs text-neutral-500">
                  Dari
                  <input
                    type="date"
                    value={tapis.dari}
                    onChange={(e) => tukarTapis('dari', e.target.value)}
                    className={`${inputClass} mt-0.5`}
                  />
                </label>

                <label className="text-xs text-neutral-500">
                  Hingga
                  <input
                    type="date"
                    value={tapis.hingga}
                    onChange={(e) => tukarTapis('hingga', e.target.value)}
                    className={`${inputClass} mt-0.5`}
                  />
                </label>

                {adaTapisan && (
                  <button
                    onClick={kosongkan}
                    className="self-end pb-2 text-left text-sm font-medium text-neutral-500 hover:text-emerald-700"
                  >
                    Kosongkan tapisan
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {ralat && <p className="text-sm text-red-600">{ralat}</p>}

              {loading && rows.length === 0 ? (
                <Memuat label="Memuatkan rekod" className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <SkeletonKad key={i} />
                  ))}
                </Memuat>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-sm text-neutral-400">
                  <Inbox size={28} />
                  Tiada rekod dijumpai.
                </div>
              ) : (
                rows.map((r) => {
                  const status = STATUS_REKOD_LABEL[statusRekod(r)]
                  const sejarah = log[r.id] ?? []
                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-opacity ${
                        loading ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {[r.pangkat, r.nama].filter(Boolean).join(' ') || 'Tanpa nama'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {r.negeri}
                            {r.no_tel && (
                              <>
                                {' · '}
                                <a href={`tel:${r.no_tel}`} className="text-emerald-700 hover:underline">
                                  {r.no_tel}
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-neutral-400">Mula</dt>
                          <dd className="text-neutral-700">{formatMasa(r.mula_masa)}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-400">Tamat</dt>
                          <dd className="text-neutral-700">{teksTamat(r)}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-400">Tempoh</dt>
                          <dd className="text-neutral-700">{formatTempoh(r)}</dd>
                        </div>
                      </dl>

                      {sejarah.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-3">
                          {sejarah.map((l, i) => {
                            const k = KEADAAN_LABEL[l.keadaan] ?? KEADAAN_LABEL.biasa
                            return (
                              <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.className}`}>
                                {formatJam(l.masa)} · {k.label}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm">
              <button
                onClick={() => setHalaman((h) => h - 1)}
                disabled={halaman <= 1 || loading}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Sebelum
              </button>
              <span className="text-neutral-500">
                Halaman {halaman} / {jumlahHalaman}
              </span>
              <button
                onClick={() => setHalaman((h) => h + 1)}
                disabled={halaman >= jumlahHalaman || loading}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                Seterusnya
                <ChevronRight size={15} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}