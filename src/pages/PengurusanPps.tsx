import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronRight, Search, MapPin, AlertTriangle, Inbox, ArrowLeft, Tent, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { ConfirmModal } from '../components/ConfirmModal'
import { Memuat, Skeleton, SkeletonKad } from '../components/Memuatkan'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { formatTarikhMasa, SEBAB_CADANGAN, STATUS_PPS } from '../lib/ppsPusat'
import type { PpsPusat, StatusPps } from '../lib/ppsPusat'

type Tindakan = 'tutup' | 'kekalkan' | 'buka_semula'
type TapisStatus = 'aktif' | 'dibuka' | 'cadangan_tutup' | 'ditutup' | 'semua'

const SEHARI = 24 * 60 * 60 * 1000

const selectClass =
  'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

const TEKS_TINDAKAN: Record<Tindakan, { tajuk: string; label: string; mesej: (n: string) => string; berjaya: string }> = {
  tutup: {
    tajuk: 'Tutup PPS',
    label: 'Tutup PPS',
    mesej: (n) => `PPS "${n}" akan ditanda DITUTUP dan tidak lagi dikira sebagai PPS dibuka.`,
    berjaya: 'PPS telah ditutup.',
  },
  kekalkan: {
    tajuk: 'Kekalkan Dibuka',
    label: 'Kekalkan',
    mesej: (n) => `Abaikan cadangan tutup untuk "${n}"? PPS akan kekal dibuka.`,
    berjaya: 'PPS dikekalkan dibuka.',
  },
  buka_semula: {
    tajuk: 'Buka Semula PPS',
    label: 'Buka Semula',
    mesej: (n) => `PPS "${n}" akan dibuka semula.`,
    berjaya: 'PPS telah dibuka semula.',
  },
}

// Glass surface + icon tile per status. Colour lives only in the icon and the badge.
const GAYA_KAD: Record<StatusPps, { kad: string; ikon: string }> = {
  dibuka: {
    kad: 'border-white/70 bg-white/55 hover:border-emerald-300/80',
    ikon: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
  },
  cadangan_tutup: {
    kad: 'border-amber-200 bg-amber-50/60 hover:border-amber-300',
    ikon: 'bg-amber-100/80 text-amber-700 ring-1 ring-amber-200',
  },
  ditutup: {
    kad: 'border-white/60 bg-white/30 hover:border-neutral-300',
    ikon: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200',
  },
}

type KadPpsProps = { pps: PpsPusat; onTindakan: (pps: PpsPusat, jenis: Tindakan) => void }

function KadPps({ pps, onTindakan }: KadPpsProps) {
  const status = STATUS_PPS[pps.status]
  const gaya = GAYA_KAD[pps.status]
  const adaLokasi = pps.latitude != null && pps.longitude != null
  const ditutup = pps.status === 'ditutup'
  // Only mention "Dikemas kini" when it actually differs from the opening time
  const adaKemaskini =
    !ditutup && Math.abs(new Date(pps.dikemaskini_pada).getTime() - new Date(pps.dibuka_pada).getTime()) > 60_000

  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition-colors ${gaya.kad}`}
    >
      {/* Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${gaya.ikon}`}>
            <Tent size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-900">{pps.nama}</p>
            <p className="truncate text-xs text-neutral-500">
              {[pps.daerah, pps.negeri].filter(Boolean).join(', ')}
              {pps.zon && ` · Zon ${pps.zon}`}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {pps.status === 'cadangan_tutup' && pps.sebab_cadangan && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100/70 px-2.5 py-1 text-xs font-medium text-amber-800">
          <AlertTriangle size={13} className="shrink-0" />
          {SEBAB_CADANGAN[pps.sebab_cadangan] ?? pps.sebab_cadangan}
        </p>
      )}

      {/* Key figures */}
      <div className={`mt-4 flex items-baseline gap-6 ${ditutup ? 'text-neutral-500' : 'text-neutral-900'}`}>
        <p>
          <span className="text-2xl font-semibold tabular-nums">{pps.jumlah_mangsa}</span>
          <span className="ml-1.5 text-xs text-neutral-500">mangsa</span>
        </p>
        <p>
          <span className="text-2xl font-semibold tabular-nums">{pps.jumlah_keluarga}</span>
          <span className="ml-1.5 text-xs text-neutral-500">keluarga</span>
        </p>
      </div>

      {/* Timeline, as one quiet line */}
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
        <Clock size={12} className="shrink-0" />
        <span>Dibuka {formatTarikhMasa(pps.dibuka_pada)}</span>
        {adaKemaskini && <span>· Dikemas kini {formatTarikhMasa(pps.dikemaskini_pada)}</span>}
        {ditutup && <span>· Ditutup {formatTarikhMasa(pps.ditutup_pada)}</span>}
      </p>

      {ditutup && pps.catatan_tutup && (
        <p className="mt-2 text-xs italic text-neutral-500">“{pps.catatan_tutup}”</p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-900/5 pt-3">
        {adaLokasi ? (
          <a
            href={`https://www.google.com/maps?q=${pps.latitude},${pps.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            <MapPin size={13} />
            Lihat lokasi
          </a>
        ) : (
          <span className="text-xs text-neutral-400">Tiada lokasi</span>
        )}

        <div className="flex flex-wrap gap-2">
          {pps.status === 'cadangan_tutup' && (
            <button
              onClick={() => onTindakan(pps, 'kekalkan')}
              className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white"
            >
              Kekalkan Dibuka
            </button>
          )}
          {!ditutup && (
            <button
              onClick={() => onTindakan(pps, 'tutup')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                pps.status === 'cadangan_tutup'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 bg-white/80 text-red-600 hover:bg-red-50'
              }`}
            >
              Tutup PPS
            </button>
          )}
          {ditutup && (
            <button
              onClick={() => onTindakan(pps, 'buka_semula')}
              className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Buka Semula
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PengurusanPps() {
  const navigate = useNavigate()
  const [senarai, setSenarai] = useState<PpsPusat[]>([])
  const [loading, setLoading] = useState(true)
  const [carian, setCarian] = useState('')
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [tapisBencana, setTapisBencana] = useState('')
  const [tapisStatus, setTapisStatus] = useState<TapisStatus>('aktif')
  const [dipilih, setDipilih] = useState<{ pps: PpsPusat; jenis: Tindakan } | null>(null)
  const [catatan, setCatatan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [ralatTindakan, setRalatTindakan] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  // Initial load + live refresh whenever a report or an action changes a PPS
  useEffect(() => {
    let batal = false

    async function muat() {
      const { data } = await supabase.from('pps_pusat').select('*').order('dikemaskini_pada', { ascending: false })
      if (batal) return
      setSenarai((data as PpsPusat[]) ?? [])
      setLoading(false)
    }

    muat()
    const channel = supabase
      .channel('pps-pusat-urus')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pps_pusat' }, () => muat())
      .subscribe()

    return () => {
      batal = true
      supabase.removeChannel(channel)
    }
  }, [])

  const bilDibuka = senarai.filter((p) => p.status === 'dibuka').length
  const bilCadangan = senarai.filter((p) => p.status === 'cadangan_tutup').length
  const bilDitutup24 = senarai.filter(
    (p) => p.status === 'ditutup' && p.ditutup_pada && Date.now() - new Date(p.ditutup_pada).getTime() < SEHARI,
  ).length

  const senaraiBencana = Array.from(new Set(senarai.map((p) => p.nama_bencana))).sort()

  const q = carian.trim().toLowerCase()
  const ditapis = senarai.filter(
    (p) =>
      (!q || p.nama.toLowerCase().includes(q) || (p.daerah ?? '').toLowerCase().includes(q)) &&
      (!tapisNegeri || p.negeri === tapisNegeri) &&
      (!tapisBencana || p.nama_bencana === tapisBencana) &&
      (tapisStatus === 'semua' || (tapisStatus === 'aktif' ? p.status !== 'ditutup' : p.status === tapisStatus)),
  )

  const perluTindakan = ditapis.filter((p) => p.status === 'cadangan_tutup')

  const ikutBencana = new Map<string, PpsPusat[]>()
  for (const p of ditapis.filter((x) => x.status !== 'cadangan_tutup')) {
    if (!ikutBencana.has(p.nama_bencana)) ikutBencana.set(p.nama_bencana, [])
    ikutBencana.get(p.nama_bencana)!.push(p)
  }

  const adaTapisan = !!(carian || tapisNegeri || tapisBencana || tapisStatus !== 'aktif')

  function bukaTindakan(pps: PpsPusat, jenis: Tindakan) {
    setDipilih({ pps, jenis })
    setCatatan('')
    setRalatTindakan('')
  }

  async function jalankanTindakan() {
    if (!dipilih) return
    setMemproses(true)
    setRalatTindakan('')

    const { error } = await supabase.rpc('tukar_status_pps', {
      p_id: dipilih.pps.id,
      p_tindakan: dipilih.jenis,
      p_catatan: catatan.trim() || null,
    })
    setMemproses(false)

    if (error) {
      setRalatTindakan(
        error.code === '42501'
          ? 'Anda tiada kebenaran untuk tindakan ini.'
          : 'Gagal mengemas kini. Status PPS mungkin telah berubah — sila cuba lagi.',
      )
      return
    }

    setToast({ type: 'success', message: TEKS_TINDAKAN[dipilih.jenis].berjaya })
    setDipilih(null)
  }

  const teks = dipilih ? TEKS_TINDAKAN[dipilih.jenis] : null

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
          <span className="font-medium text-emerald-700">Pengurusan PPS</span>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">Pengurusan PPS</h1>
        </div>

        <button
          onClick={() => navigate('/sekretariat')}
          className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>

      {/* Counters */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'PPS Dibuka', nilai: bilDibuka, warna: 'text-emerald-700' },
          { label: 'Cadangan Tutup', nilai: bilCadangan, warna: 'text-amber-600' },
          { label: 'Ditutup (24 jam lepas)', nilai: bilDitutup24, warna: 'text-neutral-600' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{k.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className={`mt-1 text-3xl font-semibold ${k.warna}`}>{k.nilai}</p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            placeholder="Cari nama PPS atau daerah..."
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select value={tapisNegeri} onChange={(e) => setTapisNegeri(e.target.value)} className={selectClass}>
          <option value="">Semua Negeri</option>
          {NEGERI_LIST.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select value={tapisBencana} onChange={(e) => setTapisBencana(e.target.value)} className={selectClass}>
          <option value="">Semua Bencana</option>
          {senaraiBencana.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={tapisStatus}
          onChange={(e) => setTapisStatus(e.target.value as TapisStatus)}
          className={selectClass}
        >
          <option value="aktif">Dibuka + Cadangan Tutup</option>
          <option value="dibuka">Dibuka sahaja</option>
          <option value="cadangan_tutup">Cadangan Tutup sahaja</option>
          <option value="ditutup">Ditutup</option>
          <option value="semua">Semua</option>
        </select>
        {adaTapisan && (
          <button
            onClick={() => {
              setCarian('')
              setTapisNegeri('')
              setTapisBencana('')
              setTapisStatus('aktif')
            }}
            className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
          >
            Kosongkan tapisan
          </button>
        )}
      </div>

      {loading ? (
        <Memuat label="Memuatkan senarai PPS" className="mt-6 grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonKad key={i} />
          ))}
        </Memuat>
      ) : ditapis.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/40 py-12 text-sm text-neutral-400 shadow-lg backdrop-blur-md">
          <Inbox size={28} />
          Tiada PPS dijumpai.
        </div>
      ) : (
        <>
          {/* Needs action */}
          {perluTindakan.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <AlertTriangle size={14} />
                Perlu Tindakan ({perluTindakan.length})
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {perluTindakan.map((p) => (
                  <div key={p.id}>
                    <p className="mb-1 text-xs font-medium text-neutral-500">{p.nama_bencana}</p>
                    <KadPps pps={p} onTindakan={bukaTindakan} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped by disaster */}
          {Array.from(ikutBencana.entries()).map(([bencana, arr]) => (
            <div key={bencana} className="mt-6">
              <h2 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <span>
                  {bencana} <span className="font-normal text-neutral-400">· {arr.length} PPS</span>
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-white/70" />
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {arr.map((p) => (
                  <KadPps key={p.id} pps={p} onTindakan={bukaTindakan} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <ConfirmModal
        open={!!dipilih}
        title={teks?.tajuk ?? ''}
        message={dipilih && teks ? teks.mesej(dipilih.pps.nama) : ''}
        confirmLabel={teks?.label}
        loadingLabel="Menyimpan..."
        danger={dipilih?.jenis === 'tutup'}
        loading={memproses}
        error={ralatTindakan}
        onConfirm={jalankanTindakan}
        onCancel={() => setDipilih(null)}
      >
        {dipilih && dipilih.jenis !== 'kekalkan' && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Catatan (pilihan)</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                dipilih.jenis === 'tutup' ? 'cth. Semua mangsa telah pulang ke rumah' : 'cth. Ditutup secara tidak sengaja'
              }
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
            />
          </div>
        )}
      </ConfirmModal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}