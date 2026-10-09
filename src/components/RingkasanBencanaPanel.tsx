import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { formatTarikh, ikonKategori, warnaSelamat } from '../lib/titikBencana'
import type { KategoriBencana, TitikBencana } from '../lib/titikBencana'
import { janaRingkasanBencana } from '../lib/janaRingkasanBencana'
import { Memuat, SkeletonKad } from './Memuatkan'

const SAIZ_HALAMAN = 10
const BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

const selectClass =
  'h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

type RingkasanBencanaPanelProps = {
  open: boolean
  onClose: () => void
  kategori: KategoriBencana[]
}

export function RingkasanBencanaPanel({ open, onClose, kategori }: RingkasanBencanaPanelProps) {
  const sekarang = new Date()
  const [tahun, setTahun] = useState(sekarang.getFullYear())
  const [bulan, setBulan] = useState(-1) // -1 = all months
  const [negeri, setNegeri] = useState('')
  const [tapisKategori, setTapisKategori] = useState('')
  const [rows, setRows] = useState<TitikBencana[]>([])
  const [loading, setLoading] = useState(false)
  const [ralat, setRalat] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [mengeksport, setMengeksport] = useState(false)

  const petaKategori = Object.fromEntries(kategori.map((k) => [k.key, k]))

  // Completed points for the chosen period. Volumes are small (one row per
  // closed incident), so we load the filtered set once and paginate locally —
  // the totals and the PDF then always match what's on screen.
  useEffect(() => {
    if (!open) return
    let batal = false
    setLoading(true)
    setRalat('')

    const mula = bulan < 0 ? new Date(tahun, 0, 1) : new Date(tahun, bulan, 1)
    const tamat = bulan < 0 ? new Date(tahun + 1, 0, 1) : new Date(tahun, bulan + 1, 1)

    let q = supabase
      .from('titik_bencana')
      .select('*')
      .eq('status', 'selesai')
      .gte('tarikh_selesai', mula.toISOString())
      .lt('tarikh_selesai', tamat.toISOString())
    if (negeri) q = q.eq('negeri', negeri)
    if (tapisKategori) q = q.eq('kategori', tapisKategori)

    q.order('tarikh_selesai', { ascending: false }).then(({ data, error }) => {
      if (batal) return
      if (error) setRalat('Gagal memuatkan ringkasan.')
      setRows((data as TitikBencana[]) ?? [])
      setHalaman(1)
      setLoading(false)
    })

    return () => {
      batal = true
    }
  }, [open, tahun, bulan, negeri, tapisKategori])

  useEffect(() => {
    if (!open) return
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [open, onClose])

  const jumlahHalaman = Math.max(1, Math.ceil(rows.length / SAIZ_HALAMAN))
  const halamanIni = rows.slice((halaman - 1) * SAIZ_HALAMAN, halaman * SAIZ_HALAMAN)
  const jumlah = (f: (r: TitikBencana) => number | null) => rows.reduce((n, r) => n + (f(r) ?? 0), 0)

  const ringkasanTapisan = [
    bulan < 0 ? `Tahun ${tahun}` : `${BULAN[bulan]} ${tahun}`,
    negeri && `Negeri: ${negeri}`,
    tapisKategori && `Kategori: ${petaKategori[tapisKategori]?.label ?? tapisKategori}`,
  ]
    .filter(Boolean)
    .join('  ·  ')

  async function eksport() {
    setMengeksport(true)
    try {
      await janaRingkasanBencana(rows, petaKategori, ringkasanTapisan)
    } catch {
      setRalat('Gagal menjana PDF.')
    } finally {
      setMengeksport(false)
    }
  }

  const senaraiTahun = Array.from({ length: 5 }, (_, i) => sekarang.getFullYear() - i)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
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
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Ringkasan Bencana</h2>
                <p className="text-xs text-neutral-500">{ringkasanTapisan}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={eksport}
                  disabled={mengeksport || rows.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <FileDown size={15} />
                  {mengeksport ? 'Menjana...' : 'Eksport PDF'}
                </button>
                <button onClick={onClose} title="Tutup" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 px-5 py-4 sm:grid-cols-4">
              <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className={selectClass}>
                {senaraiTahun.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className={selectClass}>
                <option value={-1}>Semua Bulan</option>
                {BULAN.map((b, i) => (
                  <option key={b} value={i}>
                    {b}
                  </option>
                ))}
              </select>
              <select value={negeri} onChange={(e) => setNegeri(e.target.value)} className={selectClass}>
                <option value="">Semua Negeri</option>
                {NEGERI_LIST.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select value={tapisKategori} onChange={(e) => setTapisKategori(e.target.value)} className={selectClass}>
                <option value="">Semua Kategori</option>
                {kategori.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Totals for the filtered period */}
            <div className="grid grid-cols-4 gap-2 border-b border-neutral-100 px-5 py-3 text-center">
              {[
                { label: 'Kejadian', nilai: rows.length },
                { label: 'Mangsa', nilai: jumlah((r) => r.jumlah_mangsa) },
                { label: 'KIR', nilai: jumlah((r) => r.jumlah_kir) },
                { label: 'Rumah', nilai: jumlah((r) => r.jumlah_rumah_terjejas) },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-neutral-50 py-2">
                  <p className="text-lg font-semibold tabular-nums text-neutral-900">{loading ? '—' : k.nilai}</p>
                  <p className="text-xs text-neutral-500">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {ralat && <p className="text-sm text-red-600">{ralat}</p>}

              {loading ? (
                <Memuat label="Memuatkan ringkasan" className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <SkeletonKad key={i} />
                  ))}
                </Memuat>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-sm text-neutral-400">
                  <Inbox size={28} />
                  Tiada rekod bencana untuk tempoh ini.
                </div>
              ) : (
                halamanIni.map((r) => {
                  const k = petaKategori[r.kategori]
                  const Ikon = ikonKategori(k?.ikon)
                  return (
                    <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ background: warnaSelamat(k?.warna) }}
                        >
                          <Ikon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-900">
                            {k?.label ?? r.kategori}
                            {r.lokasi && <span className="font-normal text-neutral-500"> · {r.lokasi}</span>}
                          </p>
                          <p className="text-xs text-neutral-500">{[r.daerah, r.negeri].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-neutral-400">Mula</dt>
                          <dd className="text-neutral-700">{formatTarikh(r.tarikh_mula)}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-400">Tamat</dt>
                          <dd className="text-neutral-700">{formatTarikh(r.tarikh_selesai)}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-400">Mangsa / KIR</dt>
                          <dd className="text-neutral-700">
                            {r.jumlah_mangsa ?? '—'} / {r.jumlah_kir ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-neutral-400">Rumah</dt>
                          <dd className="text-neutral-700">{r.jumlah_rumah_terjejas ?? '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm">
              <button
                onClick={() => setHalaman((h) => h - 1)}
                disabled={halaman <= 1}
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
                disabled={halaman >= jumlahHalaman}
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