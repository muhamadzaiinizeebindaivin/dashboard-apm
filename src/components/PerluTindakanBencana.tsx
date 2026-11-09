import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlarmClock,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Hourglass,
  Loader2,
  MapPin,
  MapPinned,
  Send,
  Tent,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { HAD_AMARAN_JAM, HAD_TINDAKAN_JAM } from '../lib/bencanaTamat'
import { Toast } from './Toast'
import type { ToastState } from './Toast'

// Laman Utama (staff): disasters with no new report or "Masih aktif" confirmation for
// HAD_AMARAN_JAM hours (warning) or HAD_TINDAKAN_JAM hours (action needed).
// Nothing is ended automatically any more: from 24 h a popup opens and a person decides
// (Masih aktif / Tamatkan / Hantar laporan). PKOP sees every disaster, PKON only the ones
// entirely in their own state (same rule as the Tamatkan button, enforced by the database).

type BencanaSenyap = {
  nama_bencana: string
  negeri: string[] | null
  aktiviti_terakhir: string
  pps_dibuka: number
  titik_aktif: number
}

type Aksi = { nama: string; jenis: 'aktif' | 'tamat' }

const SEJAM = 3_600_000
const HAD_PAPAR = 5 // cards shown at first, then "Lihat lagi" adds 5 more

// Names of the "24 h+" disasters whose popup was closed during this visit: the popup
// opens again only when a new disaster crosses 24 h (or after a page reload)
let ditutupUntuk = ''

const jamSenyap = (b: BencanaSenyap, kini: number) => (kini - new Date(b.aktiviti_terakhir).getTime()) / SEJAM

const formatMasa = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function useBencanaSenyap() {
  const [senarai, setSenarai] = useState<BencanaSenyap[]>([])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('bencana_perlu_tindakan', { p_amaran_jam: HAD_AMARAN_JAM })
    if (error) return // keep the last list on a network blip
    setSenarai((data as BencanaSenyap[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  // A new report, a confirmation or an end removes the disaster from the list; the poll
  // catches disasters that cross 20 h / 24 h with no change in the data
  useRealtime('perlu-tindakan-bencana', ['laporan_bencana', 'bencana_log', 'bencana_tamat'], muat, {
    tinjau: 5 * 60_000,
  })

  return { senarai, muat }
}

export function PerluTindakanBencana() {
  const { senarai, muat } = useBencanaSenyap()
  const [kini, setKini] = useState(() => Date.now())
  const [buka, setBuka] = useState(false)
  const [aksi, setAksi] = useState<Aksi | null>(null)
  const [catatan, setCatatan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [ralat, setRalat] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [bilPapar, setBilPapar] = useState(HAD_PAPAR)
  const [pukal, setPukal] = useState(false) // "Sahkan semua" confirmation shown

  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // While the popup is open, the page behind it must not scroll
  useEffect(() => {
    if (!buka) return
    const gaya = document.body.style
    const asal = { overflow: gaya.overflow, paddingRight: gaya.paddingRight }
    // Keep the layout still when the scrollbar disappears
    const lebarScrollbar = window.innerWidth - document.documentElement.clientWidth
    gaya.overflow = 'hidden'
    if (lebarScrollbar > 0) gaya.paddingRight = `${lebarScrollbar}px`
    return () => {
      gaya.overflow = asal.overflow
      gaya.paddingRight = asal.paddingRight
    }
  }, [buka])

  const kritikal = senarai.filter((b) => jamSenyap(b, kini) >= HAD_TINDAKAN_JAM)
  const amaran = senarai.filter((b) => jamSenyap(b, kini) < HAD_TINDAKAN_JAM)
  const tandatangan = kritikal
    .map((b) => b.nama_bencana)
    .sort()
    .join('|')

  // Opens by itself when a disaster reaches 24 h (not for the 20 h warning)
  useEffect(() => {
    if (tandatangan && tandatangan !== ditutupUntuk) setBuka(true)
  }, [tandatangan])

  function tutup() {
    ditutupUntuk = tandatangan
    setBuka(false)
    setAksi(null)
    setPukal(false)
    setBilPapar(HAD_PAPAR)
  }

  function mulaAksi(nama: string, jenis: Aksi['jenis']) {
    setPukal(false)
    setAksi({ nama, jenis })
    setCatatan('')
    setRalat('')
  }

  async function jalankan() {
    if (!aksi) return
    if (aksi.jenis === 'tamat' && !catatan.trim()) {
      setRalat('Sila nyatakan sebab bencana ini ditamatkan.')
      return
    }
    setMemproses(true)
    setRalat('')
    const { error } =
      aksi.jenis === 'tamat'
        ? await supabase.rpc('tamatkan_bencana', { p_nama: aksi.nama, p_catatan: catatan.trim() })
        : await supabase.rpc('sahkan_bencana_aktif', { p_nama: aksi.nama, p_catatan: catatan.trim() || null })
    setMemproses(false)

    if (error) {
      setRalat(
        error.code === '42501'
          ? 'Anda tiada kebenaran untuk tindakan ini.'
          : error.code === '23505'
            ? 'Bencana ini sudah ditamatkan.'
            : 'Gagal menyimpan. Sila cuba lagi.',
      )
      return
    }
    setToast({
      type: 'success',
      message:
        aksi.jenis === 'tamat'
          ? `Bencana "${aksi.nama}" telah ditamatkan.`
          : `Bencana "${aksi.nama}" disahkan masih aktif (${HAD_TINDAKAN_JAM} jam lagi).`,
    })
    setAksi(null)
    muat()
  }

  // Confirms every disaster in the list at once (each one is still logged with who and when)
  async function sahkanSemua() {
    setMemproses(true)
    let berjaya = 0
    const gagal: string[] = []
    for (const b of senarai) {
      const { error } = await supabase.rpc('sahkan_bencana_aktif', {
        p_nama: b.nama_bencana,
        p_catatan: 'Disahkan secara pukal',
      })
      if (error) gagal.push(b.nama_bencana)
      else berjaya++
    }
    setMemproses(false)
    setPukal(false)
    setToast(
      gagal.length === 0
        ? { type: 'success', message: `${berjaya} bencana disahkan masih aktif (${HAD_TINDAKAN_JAM} jam lagi).` }
        : { type: 'error', message: `${berjaya} disahkan, ${gagal.length} gagal: ${gagal.join(', ')}` },
    )
    muat()
  }

  if (senarai.length === 0) return <Toast toast={toast} onDismiss={() => setToast(null)} />

  const bakiTerdekat = Math.max(1, Math.ceil(Math.min(...amaran.map((b) => HAD_TINDAKAN_JAM - jamSenyap(b, kini)))))
  // Oldest first: the most urgent disaster is always at the top
  const susunan = [...senarai].sort((a, b) => jamSenyap(b, kini) - jamSenyap(a, kini))
  const dipapar = susunan.slice(0, bilPapar)
  const baki = susunan.length - dipapar.length

  return (
    <>
      {/* Banner: always visible while a disaster needs a report */}
      <button
        type="button"
        onClick={() => setBuka(true)}
        className={`mb-4 mt-2 flex w-full items-center gap-2.5 rounded-2xl border px-5 py-2.5 text-left shadow-lg backdrop-blur-md transition-colors ${
          kritikal.length > 0
            ? 'border-red-200/70 bg-red-50/80 text-red-800 hover:bg-red-100/80'
            : 'border-amber-200/70 bg-amber-50/80 text-amber-800 hover:bg-amber-100/80'
        }`}
      >
        <AlarmClock size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 text-sm">
          {kritikal.length > 0 ? (
            <>
              <span className="font-semibold">
                {kritikal.length} bencana tiada laporan lebih {HAD_TINDAKAN_JAM} jam
              </span>{' '}
              — perlu tindakan
              {amaran.length > 0 && <span className="opacity-80"> · {amaran.length} lagi hampir {HAD_TINDAKAN_JAM} jam</span>}
            </>
          ) : (
            <>
              <span className="font-semibold">{amaran.length} bencana perlu laporan</span> dalam {bakiTerdekat} jam
            </>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold">
          Lihat
          <ChevronRight size={14} />
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {buka && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1350] flex items-end justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-8"
              onClick={() => !memproses && tutup()}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/60 bg-white/45 shadow-[0_20px_60px_rgba(11,42,92,0.25)] backdrop-blur-xl sm:max-h-full"
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-5 pb-4 pt-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50/80 text-red-600 ring-1 ring-red-200/70">
                    <AlarmClock size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-neutral-900">Bencana Perlu Tindakan</h2>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                      Tiada laporan baharu atau pengesahan dalam {HAD_TINDAKAN_JAM} jam. Bencana tidak ditamatkan
                      secara automatik.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {kritikal.length > 0 && (
                        <span className="rounded-full bg-red-100/80 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200/60">
                          {kritikal.length} perlu tindakan
                        </span>
                      )}
                      {amaran.length > 0 && (
                        <span className="rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/60">
                          {amaran.length} hampir {HAD_TINDAKAN_JAM} jam
                        </span>
                      )}
                    </div>

                    {/* Bulk confirmation (2 disasters or more) */}
                    {senarai.length >= 2 && !pukal && (
                      <button
                        onClick={() => {
                          setAksi(null)
                          setPukal(true)
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 active:scale-[0.98] sm:w-auto"
                      >
                        <CheckCheck size={15} />
                        Sahkan semua masih aktif ({senarai.length})
                      </button>
                    )}
                    {pukal && (
                      <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3">
                        <p className="text-sm text-emerald-900">
                          Sahkan <span className="font-semibold">{senarai.length} bencana</span> masih aktif? Kiraan{' '}
                          {HAD_TINDAKAN_JAM} jam bagi setiap bencana akan bermula semula. Pastikan anda telah menyemak
                          dengan negeri.
                        </p>
                        <div className="mt-2.5 flex justify-end gap-2">
                          <button
                            onClick={() => setPukal(false)}
                            disabled={memproses}
                            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white/80 disabled:opacity-60"
                          >
                            Batal
                          </button>
                          <button
                            onClick={sahkanSemua}
                            disabled={memproses}
                            className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800 disabled:opacity-70"
                          >
                            {memproses && <Loader2 size={15} className="animate-spin" />}
                            Ya, sahkan semua
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={tutup}
                    disabled={memproses}
                    aria-label="Tutup"
                    className="-mr-1 -mt-1 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white/60 hover:text-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* One card per disaster, oldest first, HAD_PAPAR at a time */}
                <div className="space-y-3 border-t border-white/50 px-5 pb-5 pt-4">
                  {dipapar.map((b) => {
                    const jam = jamSenyap(b, kini)
                    const lewat = jam >= HAD_TINDAKAN_JAM
                    const dipilih = aksi?.nama === b.nama_bencana ? aksi : null

                    return (
                      <div
                        key={b.nama_bencana}
                        className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md"
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                              lewat ? 'bg-red-50 text-red-600 ring-red-200/70' : 'bg-amber-50 text-amber-600 ring-amber-200/70'
                            }`}
                          >
                            {lewat ? <AlertTriangle size={20} /> : <Hourglass size={20} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="min-w-0 text-base font-semibold uppercase leading-snug text-neutral-900">
                                {b.nama_bencana}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  lewat ? 'bg-red-100/80 text-red-700' : 'bg-amber-100/80 text-amber-800'
                                }`}
                              >
                                {lewat
                                  ? `${Math.floor(jam)} j tiada laporan`
                                  : `Baki ${Math.max(1, Math.ceil(HAD_TINDAKAN_JAM - jam))} j`}
                              </span>
                            </div>
                            {(b.negeri ?? []).length > 0 && (
                              <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                                <MapPin size={14} className="shrink-0" />
                                {(b.negeri ?? []).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Figures, as in the Pengurusan Bencana cards */}
                        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                          {[
                            { ikon: Tent, nilai: b.pps_dibuka, label: 'PPS dibuka' },
                            { ikon: MapPinned, nilai: b.titik_aktif, label: 'titik di peta' },
                            { ikon: Clock, nilai: `${Math.floor(jam)} j`, label: 'sejak aktiviti' },
                          ].map((x) => (
                            <div key={x.label} className="rounded-xl border border-white/70 bg-white/50 px-2.5 py-2.5 sm:px-3.5 sm:py-3">
                              <p className="text-xl font-semibold tabular-nums leading-none text-neutral-900">{x.nilai}</p>
                              <p className="mt-1.5 flex items-center gap-1 text-[11px] uppercase leading-tight tracking-wide text-neutral-500">
                                <x.ikon size={12} className="shrink-0" />
                                {x.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2.5 text-xs text-neutral-500">
                          Aktiviti terakhir {formatMasa(b.aktiviti_terakhir)}
                        </p>

                        {dipilih ? (
                          <div className="mt-4 border-t border-neutral-900/5 pt-4">
                            {dipilih.jenis === 'tamat' && (
                              <p className="mb-3 rounded-lg bg-red-50/80 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/60">
                                {b.pps_dibuka} PPS dan {b.titik_aktif} titik bencana akan ditutup.
                              </p>
                            )}
                            <label className="mb-1.5 block text-sm font-medium text-neutral-600">
                              {dipilih.jenis === 'tamat' ? 'Sebab (wajib)' : 'Catatan (pilihan)'}
                            </label>
                            <textarea
                              rows={3}
                              autoFocus
                              value={catatan}
                              onChange={(e) => setCatatan(e.target.value)}
                              placeholder={
                                dipilih.jenis === 'tamat'
                                  ? 'cth. Semua mangsa telah pulang, operasi tamat'
                                  : 'cth. Laporan Semasa akan dihantar petang ini'
                              }
                              className="w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-neutral-800 outline-none backdrop-blur-sm focus:border-emerald-600"
                            />
                            {ralat && <p className="mt-1.5 text-sm text-red-600">{ralat}</p>}
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                              <button
                                onClick={() => setAksi(null)}
                                disabled={memproses}
                                className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white/80 disabled:opacity-60"
                              >
                                Batal
                              </button>
                              <button
                                onClick={jalankan}
                                disabled={memproses}
                                className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-md transition-colors disabled:opacity-70 ${
                                  dipilih.jenis === 'tamat'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-emerald-700 hover:bg-emerald-800'
                                }`}
                              >
                                {memproses && <Loader2 size={15} className="animate-spin" />}
                                {dipilih.jenis === 'tamat' ? 'Tamatkan' : 'Sahkan masih aktif'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Phone: the two buttons side by side, full width, "Hantar laporan" under them
                          <div className="mt-4 flex flex-col-reverse gap-3 border-t border-neutral-900/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <Link
                              to="/hantar-laporan?jenis=semasa"
                              onClick={tutup}
                              className="flex items-center justify-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-emerald-700"
                            >
                              <Send size={15} />
                              Hantar laporan
                            </Link>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                              <button
                                onClick={() => mulaAksi(b.nama_bencana, 'tamat')}
                                className="flex items-center justify-center gap-1.5 rounded-full border border-red-200/80 bg-white/60 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50/80"
                              >
                                <Flag size={15} />
                                Tamatkan
                              </button>
                              <button
                                onClick={() => mulaAksi(b.nama_bencana, 'aktif')}
                                className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800"
                              >
                                <CheckCircle2 size={15} />
                                Masih aktif
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {baki > 0 && (
                    <button
                      onClick={() => setBilPapar((n) => n + HAD_PAPAR)}
                      className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-white/80 bg-white/40 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-white/60"
                    >
                      <ChevronDown size={15} />
                      Lihat {Math.min(HAD_PAPAR, baki)} lagi ({baki} belum dipapar)
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  )
}