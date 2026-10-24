import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, CalendarRange, ChevronRight, Home, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { useAuth } from '../hooks/useAuth'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { Memuat, SkeletonKad } from '../components/Memuatkan'
import { PaparanStatistikMusim } from '../components/PaparanStatistikMusim'

// Seasons / weather phenomena with dates set by Sekretariat (table musim_monsun),
// e.g. "Monsun Timur Laut", "La Niña". Each season opens its full statistics.

export type Musim = {
  id: string
  nama: string
  jenis: string // Jenis Fenomena Cuaca, free text
  tarikh_mula: string // YYYY-MM-DD
  tarikh_tamat: string // YYYY-MM-DD, inclusive
  catatan: string | null
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

// "2026-11-01" -> "01 Nov 2026" (read as a calendar date, no timezone shift)
function formatTarikh(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function hariIni() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function bilHari(mula: string, tamat: string) {
  const [a, b] = [mula, tamat].map((s) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  })
  return Math.round((b - a) / 86_400_000) + 1
}

function statusMusim(m: Musim): { label: string; className: string } {
  const kini = hariIni()
  if (kini < m.tarikh_mula) return { label: 'Akan datang', className: 'bg-neutral-100 text-neutral-600' }
  if (kini > m.tarikh_tamat) return { label: 'Selesai', className: 'bg-neutral-100 text-neutral-500' }
  return { label: 'Sedang berlangsung', className: 'bg-emerald-100 text-emerald-800' }
}

// Initials of the phenomenon + years: "Monsun Timur Laut" 2026→2027 = "MTL 2026/2027", "La Niña" 2027 = "LN 2027"
function namaCadangan(jenis: string, mula: string, tamat: string) {
  if (!mula || !tamat) return ''
  const singkatan = jenis
    .trim()
    .split(/[\s\-/]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('')
  const [y1, y2] = [mula.slice(0, 4), tamat.slice(0, 4)]
  const tahun = y1 === y2 ? y1 : `${y1}/${y2}`
  return singkatan ? `${singkatan} ${tahun}` : tahun
}

// ---------------------------------------------------------------------------
// Add / edit form
// ---------------------------------------------------------------------------
type MusimModalProps = {
  musim: Musim | null // null = new season
  onClose: () => void
  onSaved: (baru: boolean) => void
}

function MusimModal({ musim, onClose, onSaved }: MusimModalProps) {
  const [jenis, setJenis] = useState(musim?.jenis ?? '')
  const [mula, setMula] = useState(musim?.tarikh_mula ?? '')
  const [tamat, setTamat] = useState(musim?.tarikh_tamat ?? '')
  const [nama, setNama] = useState(musim?.nama ?? '')
  // The name follows the type and dates until the user types their own
  const [namaDiubah, setNamaDiubah] = useState(!!musim)
  const [catatan, setCatatan] = useState(musim?.catatan ?? '')
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  const namaPapar = namaDiubah ? nama : namaCadangan(jenis, mula, tamat)

  async function simpan() {
    setRalat('')
    if (!jenis.trim()) {
      setRalat('Sila isi Jenis Fenomena Cuaca.')
      return
    }
    if (!mula || !tamat) {
      setRalat('Sila pilih Tarikh Mula dan Tarikh Tamat.')
      return
    }
    if (tamat < mula) {
      setRalat('Tarikh Tamat mesti selepas Tarikh Mula.')
      return
    }
    if (!namaPapar.trim()) {
      setRalat('Sila isi Nama Musim.')
      return
    }

    const rekod = {
      nama: namaPapar.trim(),
      jenis: jenis.trim(),
      tarikh_mula: mula,
      tarikh_tamat: tamat,
      catatan: catatan.trim() || null,
    }
    setMenyimpan(true)
    const { error } = musim
      ? await supabase.from('musim_monsun').update(rekod).eq('id', musim.id)
      : await supabase.from('musim_monsun').insert(rekod)
    setMenyimpan(false)

    if (error) {
      setRalat(
        error.code === '23P01'
          ? `Tarikh ini bertindih dengan musim "${jenis.trim()}" yang lain.`
          : error.code === '23505'
            ? 'Nama musim ini sudah wujud.'
            : error.code === '42501'
              ? 'Anda tiada kebenaran untuk tindakan ini.'
              : 'Gagal menyimpan. Sila cuba lagi.',
      )
      return
    }
    onSaved(!musim)
  }

  return createPortal(
    <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">{musim ? 'Kemaskini' : 'Tambah'}</h2>
          <button onClick={onClose} title="Tutup" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Jenis Fenomena Cuaca <span className="text-red-500">*</span>
            </label>
            <input
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              placeholder="cth. Monsun Timur Laut, La Niña"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Tarikh Mula <span className="text-red-500">*</span>
              </label>
              <input type="date" value={mula} onChange={(e) => setMula(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Tarikh Tamat <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tamat}
                min={mula || undefined}
                onChange={(e) => setTamat(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nama Musim <span className="text-red-500">*</span>
            </label>
            <input
              value={namaPapar}
              placeholder="cth. MTL 2026/2027"
              onChange={(e) => {
                setNamaDiubah(true)
                setNama(e.target.value)
              }}
              className={inputClass}
            />
            {mula && tamat && tamat >= mula && (
              <p className="mt-1 text-xs text-neutral-500">Tempoh: {bilHari(mula, tamat)} hari</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="cth. Tarikh mengikut pengumuman MetMalaysia"
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          {ralat && <p className="mb-3 text-sm text-red-600">{ralat}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              onClick={simpan}
              disabled={menyimpan}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function StatistikMusim() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const bolehUrus = profile?.role === 'pkop'

  const [senarai, setSenarai] = useState<Musim[]>([])
  const [memuat, setMemuat] = useState(true)
  const [borang, setBorang] = useState<{ musim: Musim | null } | null>(null)
  const [hendakPadam, setHendakPadam] = useState<Musim | null>(null)
  const [memadam, setMemadam] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  // Season whose statistics are open (null = list); follows edits / deletion of that season
  const [dilihatId, setDilihatId] = useState<string | null>(null)
  const dilihat = senarai.find((m) => m.id === dilihatId) ?? null

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from('musim_monsun')
      .select('id, nama, jenis, tarikh_mula, tarikh_tamat, catatan')
      .order('tarikh_mula', { ascending: false })
    setMemuat(false)
    if (error) {
      setToast({ type: 'error', message: 'Gagal memuatkan senarai musim.' })
      return
    }
    setSenarai((data as Musim[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('musim-monsun', ['musim_monsun'], muat)

  async function padam() {
    if (!hendakPadam) return
    setMemadam(true)
    const { error } = await supabase.from('musim_monsun').delete().eq('id', hendakPadam.id)
    setMemadam(false)
    setHendakPadam(null)
    setToast(
      error
        ? { type: 'error', message: error.code === '42501' ? 'Anda tiada kebenaran untuk tindakan ini.' : 'Gagal memadam. Sila cuba lagi.' }
        : { type: 'success', message: 'Musim dipadam.' },
    )
    if (!error) muat()
  }

  return (
    <div>
      {/* Header */}
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
            <span className="font-medium text-emerald-700">Statistik Musim</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Statistik Musim</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bolehUrus && (
            <button
              onClick={() => setBorang({ musim: null })}
              className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800"
            >
              <Plus size={16} />
              Tambah Musim
            </button>
          )}
          <button
            onClick={() => navigate('/sekretariat')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-2.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700 sm:py-1.5"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        </div>
      </div>

      {dilihat ? (
        <PaparanStatistikMusim
          musim={dilihat}
          senarai={senarai}
          onTukar={(m) => setDilihatId(m.id)}
          onKembali={() => setDilihatId(null)}
        />
      ) : memuat ? (
        <Memuat label="Memuatkan senarai musim" className="mt-6 grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonKad key={i} />
          ))}
        </Memuat>
      ) : senarai.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/40 py-14 text-center shadow-lg backdrop-blur-md">
          <CalendarRange size={28} className="text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">Belum ada musim ditetapkan.</p>
          <p className="max-w-sm text-xs text-neutral-400">
            {bolehUrus
              ? 'Tekan "Tambah Musim" untuk menetapkan tarikh sesuatu musim atau fenomena cuaca.'
              : 'Musim akan dipaparkan di sini selepas ditetapkan oleh Super Admin.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {senarai.map((m) => {
            const status = statusMusim(m)
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/60 bg-white/60 p-5 shadow-lg backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-neutral-900">{m.nama}</h2>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                        {m.jenis}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {formatTarikh(m.tarikh_mula)} – {formatTarikh(m.tarikh_tamat)}
                      <span className="text-neutral-400"> · {bilHari(m.tarikh_mula, m.tarikh_tamat)} hari</span>
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                {m.catatan && <p className="mt-3 text-xs italic text-neutral-500">{m.catatan}</p>}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-1.5 border-t border-neutral-100 pt-3">
                  <button
                    onClick={() => setDilihatId(m.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    <BarChart3 size={13} />
                    Lihat Statistik
                  </button>
                  {bolehUrus && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setBorang({ musim: m })}
                      title="Kemaskini"
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-emerald-500 hover:text-emerald-700"
                    >
                      <Pencil size={13} />
                      Kemaskini
                    </button>
                    <button
                      onClick={() => setHendakPadam(m)}
                      title="Padam"
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Padam
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {borang && (
        <MusimModal
          musim={borang.musim}
          onClose={() => setBorang(null)}
          onSaved={(baru) => {
            setBorang(null)
            setToast({ type: 'success', message: baru ? 'Musim ditambah.' : 'Musim dikemaskini.' })
            muat()
          }}
        />
      )}

      <ConfirmModal
        open={!!hendakPadam}
        title="Padam Musim"
        message={`Padam musim "${hendakPadam?.nama ?? ''}"? Data bencana tidak terjejas — hanya tetapan tarikh musim ini dipadam.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={memadam}
        onConfirm={padam}
        onCancel={() => setHendakPadam(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}