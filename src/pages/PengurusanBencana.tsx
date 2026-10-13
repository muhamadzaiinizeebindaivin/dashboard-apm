import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Search,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BellOff,
  MapPinned,
  MapPinOff,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TREND_LABEL } from '../lib/laporanBencana'
import { formatTarikh } from '../lib/titikBencana'
import { HAD_TIADA_KEMASKINI_JAM } from '../lib/ppsPusat'
import { useBencanaTamat } from '../lib/bencanaTamat'
import type { BencanaTamat } from '../lib/bencanaTamat'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { Memuat, Skeleton, SkeletonKad } from '../components/Memuatkan'
import { PilihLokasiModal } from '../components/PilihLokasiModal'

type BarisLaporan = {
  nama_bencana: string | null
  jenis_bencana: string | null
  negeri: string | null
  jenis_laporan: string
  trend: string | null
  created_at: string
}

type BarisPps = {
  nama_bencana: string
  negeri: string
  status: string
  jumlah_mangsa: number
  dibuka_pada: string
  dilapor_pada: string | null
}

type RingkasanBencana = {
  nama: string
  jenis: string
  negeri: string[]
  bilLaporan: number
  laporanTerakhir: string
  trend: string | null
  ppsDibuka: number
  ppsSenyap: number // open PPS with no report for more than HAD_TIADA_KEMASKINI_JAM hours
  mangsa: number
  adaTitik: boolean // has an active point on the Peta Bencana
  tamat: BencanaTamat | null
}

type TapisStatus = 'semua' | 'aktif' | 'tamat'

const SEMINIT = 60 * 1000

const selectClass =
  'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

type KadBencanaProps = {
  b: RingkasanBencana
  onTamat: (b: RingkasanBencana) => void
  onAktif: (b: RingkasanBencana) => void
  onLokasi: (b: RingkasanBencana) => void
}

function KadBencana({ b, onTamat, onAktif, onLokasi }: KadBencanaProps) {
  const tamat = !!b.tamat
  const trend = b.trend ? TREND_LABEL[b.trend] : null

  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition-colors ${
        tamat ? 'border-white/60 bg-white/30' : 'border-white/70 bg-white/55 hover:border-emerald-300/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
              tamat ? 'bg-neutral-100 text-neutral-500 ring-neutral-200' : 'bg-red-50 text-red-600 ring-red-200/70'
            }`}
          >
            {tamat ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-900">{b.nama}</p>
            <p className="truncate text-xs text-neutral-500">
              {b.jenis}
              {b.negeri.length > 0 && ` · ${b.negeri.join(', ')}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {!tamat && trend && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${trend.className}`}>{trend.label}</span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tamat ? 'bg-neutral-200 text-neutral-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {tamat ? 'Tamat' : 'Aktif'}
            </span>
          </div>
          {!tamat && !b.adaTitik && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              <MapPinOff size={11} />
              Tiada titik di peta
            </span>
          )}
          {!tamat && b.ppsSenyap > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
              <BellOff size={11} />
              {b.ppsSenyap} PPS tiada kemas kini
            </span>
          )}
        </div>
      </div>

      <div className={`mt-4 flex items-baseline gap-6 ${tamat ? 'text-neutral-500' : 'text-neutral-900'}`}>
        <p>
          <span className="text-2xl font-semibold tabular-nums">{b.ppsDibuka}</span>
          <span className="ml-1.5 text-xs text-neutral-500">PPS dibuka</span>
        </p>
        <p>
          <span className="text-2xl font-semibold tabular-nums">{b.mangsa}</span>
          <span className="ml-1.5 text-xs text-neutral-500">mangsa</span>
        </p>
        <p>
          <span className="text-2xl font-semibold tabular-nums">{b.bilLaporan}</span>
          <span className="ml-1.5 text-xs text-neutral-500">laporan</span>
        </p>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
        <Clock size={12} className="shrink-0" />
        <span>Laporan terakhir {formatTarikh(b.laporanTerakhir)}</span>
        {b.tamat && <span>· Ditamatkan {formatTarikh(b.tamat.ditamatkan_pada)}</span>}
      </p>
      {b.tamat?.catatan && <p className="mt-2 text-xs italic text-neutral-500">“{b.tamat.catatan}”</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-900/5 pt-3">
        {!tamat && !b.adaTitik && (
          <button
            onClick={() => onLokasi(b)}
            className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 sm:py-1.5"
          >
            <MapPinned size={13} />
            Tetapkan lokasi
          </button>
        )}
        {tamat ? (
          <button
            onClick={() => onAktif(b)}
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 sm:py-1.5"
          >
            Aktifkan Semula
          </button>
        ) : (
          <button
            onClick={() => onTamat(b)}
            className="rounded-full border border-red-200 bg-white/80 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 sm:py-1.5"
          >
            Tamatkan Bencana
          </button>
        )}
      </div>
    </div>
  )
}

export function PengurusanBencana() {
  const navigate = useNavigate()
  const senaraiTamat = useBencanaTamat()
  const [laporan, setLaporan] = useState<BarisLaporan[]>([])
  const [pps, setPps] = useState<BarisPps[]>([])
  const [namaBertitik, setNamaBertitik] = useState<Set<string>>(new Set())
  const [lokasiUntuk, setLokasiUntuk] = useState<RingkasanBencana | null>(null)
  const [loading, setLoading] = useState(true)
  const [carian, setCarian] = useState('')
  const [tapisStatus, setTapisStatus] = useState<TapisStatus>('semua')
  const [dipilih, setDipilih] = useState<{ b: RingkasanBencana; jenis: 'tamat' | 'aktif' } | null>(null)
  const [catatan, setCatatan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [ralat, setRalat] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  // "Tiada kemas kini" depends on the clock, not only on data changes
  const [kini, setKini] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), SEMINIT)
    return () => clearInterval(t)
  }, [])

  const muat = useCallback(async () => {
    const [{ data: l }, { data: p }, { data: t }] = await Promise.all([
      supabase
        .from('laporan_bencana')
        .select('nama_bencana, jenis_bencana, negeri, jenis_laporan, trend, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('pps_pusat').select('nama_bencana, negeri, status, jumlah_mangsa, dibuka_pada, dilapor_pada'),
      supabase.from('titik_bencana').select('nama_bencana').eq('status', 'aktif').not('nama_bencana', 'is', null),
    ])
    setLaporan((l as BarisLaporan[]) ?? [])
    setPps((p as BarisPps[]) ?? [])
    setNamaBertitik(new Set(((t as { nama_bencana: string }[]) ?? []).map((x) => x.nama_bencana)))
    setLoading(false)
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel('pengurusan-bencana')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_bencana' }, () => muat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pps_pusat' }, () => muat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_bencana' }, () => muat())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muat])

  // One entry per disaster name (same grouping as the daily report; names are
  // stored in one canonical form, so "Banjir Kelantan" variants are one entry)
  const tamatIkutNama = new Map(senaraiTamat.map((t) => [t.nama_bencana, t]))
  const kumpulan = new Map<string, RingkasanBencana>()
  for (const r of laporan) {
    const nama = (r.nama_bencana ?? '').trim() || 'TIADA NAMA'
    let b = kumpulan.get(nama)
    if (!b) {
      b = {
        nama,
        jenis: r.jenis_bencana || 'Lain-lain',
        negeri: [],
        bilLaporan: 0,
        laporanTerakhir: r.created_at, // rows are newest-first
        trend: null,
        ppsDibuka: 0,
        ppsSenyap: 0,
        mangsa: 0,
        adaTitik: namaBertitik.has(nama),
        tamat: tamatIkutNama.get(nama) ?? null,
      }
      kumpulan.set(nama, b)
    }
    b.bilLaporan += 1
    if (r.negeri && !b.negeri.includes(r.negeri)) b.negeri.push(r.negeri)
    if (!b.trend && r.jenis_laporan === 'semasa') b.trend = r.trend
  }
  const hadSenyap = HAD_TIADA_KEMASKINI_JAM * 3_600_000
  for (const p of pps) {
    const b = kumpulan.get(p.nama_bencana)
    if (!b) continue
    if (!b.negeri.includes(p.negeri)) b.negeri.push(p.negeri)
    if (p.status !== 'ditutup') {
      b.ppsDibuka += 1
      b.mangsa += p.jumlah_mangsa
    }
    if (p.status === 'dibuka' && kini - new Date(p.dilapor_pada ?? p.dibuka_pada).getTime() > hadSenyap) {
      b.ppsSenyap += 1
    }
  }

  // Active first (newest report first), then ended (most recently ended first)
  const semua = Array.from(kumpulan.values()).sort((a, b) => {
    if (!!a.tamat !== !!b.tamat) return a.tamat ? 1 : -1
    const ma = a.tamat ? a.tamat.ditamatkan_pada : a.laporanTerakhir
    const mb = b.tamat ? b.tamat.ditamatkan_pada : b.laporanTerakhir
    return new Date(mb).getTime() - new Date(ma).getTime()
  })

  const q = carian.trim().toLowerCase()
  const ditapis = semua.filter(
    (b) =>
      (!q || b.nama.toLowerCase().includes(q) || b.jenis.toLowerCase().includes(q)) &&
      (tapisStatus === 'semua' || (tapisStatus === 'tamat' ? !!b.tamat : !b.tamat)),
  )

  const bilAktif = semua.filter((b) => !b.tamat).length
  const bilTamat = semua.length - bilAktif

  function buka(b: RingkasanBencana, jenis: 'tamat' | 'aktif') {
    setDipilih({ b, jenis })
    setCatatan('')
    setRalat('')
  }

  async function jalankan() {
    if (!dipilih) return
    setMemproses(true)
    setRalat('')
    const { error } =
      dipilih.jenis === 'tamat'
        ? await supabase.rpc('tamatkan_bencana', { p_nama: dipilih.b.nama, p_catatan: catatan.trim() || null })
        : await supabase.rpc('aktifkan_semula_bencana', { p_nama: dipilih.b.nama, p_catatan: catatan.trim() || null })
    setMemproses(false)

    if (error) {
      setRalat(
        error.code === '42501'
          ? 'Anda tiada kebenaran untuk tindakan ini.'
          : 'Gagal mengemas kini. Status bencana mungkin telah berubah. Sila cuba lagi.',
      )
      return
    }
    setToast({
      type: 'success',
      message: dipilih.jenis === 'tamat' ? 'Bencana telah ditamatkan.' : 'Bencana diaktifkan semula.',
    })
    setDipilih(null)
  }

  // Places a disaster that has no Laporan Awal point on the Peta Bencana
  async function simpanLokasi(lat: number, lng: number) {
    if (!lokasiUntuk) return
    const nama = lokasiUntuk.nama
    setLokasiUntuk(null)
    const { error } = await supabase.rpc('tetapkan_lokasi_bencana', {
      p_nama: nama,
      p_latitude: lat,
      p_longitude: lng,
    })
    setToast(
      error
        ? { type: 'error', message: 'Gagal menetapkan lokasi. Sila cuba lagi.' }
        : { type: 'success', message: `Titik "${nama}" ditambah ke Peta Bencana.` },
    )
  }

  const mesejTamat = (b: RingkasanBencana) =>
    `Bencana "${b.nama}" akan ditanda TAMAT dalam Laporan Harian dan titik bencananya pada peta ditanda selesai.` +
    (b.ppsDibuka > 0 ? ` ${b.ppsDibuka} PPS yang masih dibuka akan ditutup secara automatik.` : '')

  return (
    <div>
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
            <span className="font-medium text-emerald-700">Pengurusan Bencana</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Pengurusan Bencana</h1>
        </div>
        <button
          onClick={() => navigate('/sekretariat')}
          className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-2.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700 sm:py-1.5"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: 'Bencana Aktif', nilai: bilAktif, warna: 'text-red-600', tapis: 'aktif' as const },
          { label: 'Bencana Tamat', nilai: bilTamat, warna: 'text-neutral-600', tapis: 'tamat' as const },
        ].map((k) => (
          <button
            key={k.label}
            onClick={() => setTapisStatus(k.tapis)}
            className="rounded-2xl border border-white/60 bg-white/40 px-5 py-4 text-left shadow-lg backdrop-blur-md transition-colors hover:border-neutral-400"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{k.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className={`mt-1 text-3xl font-semibold ${k.warna}`}>{k.nilai}</p>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            placeholder="Cari nama atau jenis bencana..."
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select
          value={tapisStatus}
          onChange={(e) => setTapisStatus(e.target.value as TapisStatus)}
          className={selectClass}
        >
          <option value="semua">Semua</option>
          <option value="aktif">Aktif</option>
          <option value="tamat">Tamat</option>
        </select>
      </div>

      {loading ? (
        <Memuat label="Memuatkan senarai bencana" className="mt-6 grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonKad key={i} />
          ))}
        </Memuat>
      ) : ditapis.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/40 py-12 text-sm text-neutral-400 shadow-lg backdrop-blur-md">
          <Inbox size={28} />
          Tiada bencana dijumpai.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {ditapis.map((b) => (
            <KadBencana
              key={b.nama}
              b={b}
              onTamat={(x) => buka(x, 'tamat')}
              onAktif={(x) => buka(x, 'aktif')}
              onLokasi={setLokasiUntuk}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!dipilih}
        title={dipilih?.jenis === 'tamat' ? 'Tamatkan Bencana' : 'Aktifkan Semula Bencana'}
        message={
          dipilih
            ? dipilih.jenis === 'tamat'
              ? mesejTamat(dipilih.b)
              : `Bencana "${dipilih.b.nama}" akan diaktifkan semula. PPS dan titik bencana yang telah ditutup tidak dibuka semula secara automatik.`
            : ''
        }
        confirmLabel={dipilih?.jenis === 'tamat' ? 'Tamatkan' : 'Aktifkan Semula'}
        loadingLabel="Menyimpan..."
        danger={dipilih?.jenis === 'tamat'}
        loading={memproses}
        error={ralat}
        onConfirm={jalankan}
        onCancel={() => setDipilih(null)}
      >
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-neutral-600">Catatan (pilihan)</label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              dipilih?.jenis === 'tamat' ? 'cth. Operasi bantuan bencana telah tamat' : 'cth. Ditamatkan secara tidak sengaja'
            }
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
          />
        </div>
      </ConfirmModal>

      <PilihLokasiModal
        open={!!lokasiUntuk}
        tajuk={lokasiUntuk ? `Lokasi: ${lokasiUntuk.nama}` : 'Pilih Lokasi'}
        negeri={lokasiUntuk?.negeri[0]}
        awal={null}
        onClose={() => setLokasiUntuk(null)}
        onSimpan={simpanLokasi}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}