import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  HeartPulse,
  Home,
  MapPinned,
  RefreshCw,
  Tent,
  Truck,
  Users,
  Wrench,
  Construction,
} from 'lucide-react'
import { ambilStatistikMusim } from '../lib/statistikMusim'
import type { Puncak, StatistikMusimData, TitikHarian } from '../lib/statistikMusim'
import type { Musim } from '../pages/StatistikMusim'
import { Memuat, Skeleton } from './Memuatkan'
import { Toast } from './Toast'
import type { ToastState } from './Toast'

// Statistics of one season (Statistik Musim page, Phase 2)

const LABEL_JENIS: Record<Musim['jenis'], string> = {
  timur_laut: 'Monsun Timur Laut',
  barat_daya: 'Monsun Barat Daya',
}

const nombor = (n: number) => n.toLocaleString('ms-MY', { maximumFractionDigits: 1 })

function tarikhPendek(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const kad = 'rounded-2xl border border-white/60 bg-white/60 p-5 shadow-lg backdrop-blur-md'

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
function KadAngka({ ikon: Ikon, label, nilai, kecil }: { ikon: LucideIcon; label: string; nilai: string; kecil?: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Ikon size={15} />
        </span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{nilai}</p>
      {kecil && <p className="mt-0.5 text-xs text-neutral-500">{kecil}</p>}
    </div>
  )
}

function Bahagian({ tajuk, ikon: Ikon, anak, children }: { tajuk: string; ikon: LucideIcon; anak?: ReactNode; children: ReactNode }) {
  return (
    <section className={`mt-6 ${kad}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
          <Ikon size={17} className="text-emerald-700" />
          {tajuk}
        </h2>
        {anak}
      </div>
      {children}
    </section>
  )
}

type JadualProps = { kepala: string[]; baris: (string | number)[][]; kosong: string; kananDari?: number }

// Simple table; columns from `kananDari` on are numbers (right-aligned)
function Jadual({ kepala, baris, kosong, kananDari = 1 }: JadualProps) {
  if (baris.length === 0) return <p className="py-6 text-center text-sm text-neutral-400">{kosong}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            {kepala.map((k, i) => (
              <th key={k} className={`px-3 py-2 font-semibold ${i >= kananDari ? 'text-right' : ''}`}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => (
            <tr key={i} className="border-b border-neutral-100 last:border-0">
              {b.map((sel, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j >= kananDari ? 'text-right tabular-nums' : ''} ${j === 0 ? 'font-medium text-neutral-800' : 'text-neutral-600'}`}
                >
                  {typeof sel === 'number' ? nombor(sel) : sel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Victims in PPS, day by day, with the peak marked
function GrafHarian({ titik, puncak }: { titik: TitikHarian[]; puncak: Puncak }) {
  if (titik.length === 0) return <p className="py-6 text-center text-sm text-neutral-400">Tiada data harian.</p>
  const w = 800
  const h = 220
  const kiri = 48
  const bawah = 26
  const atas = 14
  const max = Math.max(1, ...titik.map((t) => t.mangsa))
  const x = (i: number) => kiri + (titik.length === 1 ? (w - kiri) / 2 : (i * (w - kiri - 8)) / (titik.length - 1))
  const y = (v: number) => atas + (h - atas - bawah) * (1 - v / max)
  const garis = titik.map((t, i) => `${x(i)},${y(t.mangsa)}`).join(' ')
  const kawasan = `${x(0)},${y(0)} ${garis} ${x(titik.length - 1)},${y(0)}`
  const langkah = Math.max(1, Math.ceil(titik.length / 7))
  const iPuncak = puncak ? titik.findIndex((t) => t.tarikh === puncak.tarikh) : -1

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[560px]">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={kiri} x2={w} y1={y(max * f)} y2={y(max * f)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={kiri - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="#9ca3af">
              {nombor(Math.round(max * f))}
            </text>
          </g>
        ))}
        <polygon points={kawasan} fill="#2563eb" fillOpacity="0.12" />
        <polyline points={garis} fill="none" stroke="#2563eb" strokeWidth="2" />
        {titik.map((t, i) =>
          i % langkah === 0 || i === titik.length - 1 ? (
            <text key={t.tarikh} x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="#6b7280">
              {t.label}
            </text>
          ) : null,
        )}
        {iPuncak >= 0 && (
          <g>
            <circle cx={x(iPuncak)} cy={y(titik[iPuncak].mangsa)} r="5" fill="#f97316" stroke="#fff" strokeWidth="2" />
            <text
              x={x(iPuncak)}
              y={Math.max(12, y(titik[iPuncak].mangsa) - 10)}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#c2410c"
            >
              Tertinggi {nombor(titik[iPuncak].mangsa)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

function RangkaStatistik() {
  return (
    <Memuat label="Mengira statistik musim" className="mt-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </Memuat>
  )
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------
type Props = {
  musim: Musim
  senarai: Musim[]
  onTukar: (m: Musim) => void
  onKembali: () => void
}

export function PaparanStatistikMusim({ musim, senarai, onTukar, onKembali }: Props) {
  const [data, setData] = useState<StatistikMusimData | null>(null)
  const [ralat, setRalat] = useState(false)
  const [muatSemula, setMuatSemula] = useState(0)
  const [menjana, setMenjana] = useState<'' | 'pdf' | 'excel'>('')
  const [toast, setToast] = useState<ToastState>(null)

  // Export the figures already on screen (libraries are loaded only on click)
  async function eksport(jenis: 'pdf' | 'excel') {
    if (!data) return
    setMenjana(jenis)
    try {
      const m = await import('../lib/eksportStatistikMusim')
      if (jenis === 'pdf') await m.janaPdfStatistikMusim(musim, data)
      else await m.janaExcelStatistikMusim(musim, data)
    } catch {
      setToast({ type: 'error', message: `Gagal menjana ${jenis === 'pdf' ? 'PDF' : 'Excel'}. Sila cuba lagi.` })
    } finally {
      setMenjana('')
    }
  }
  const bolehEksport = !!data && !data.belumMula && !menjana

  useEffect(() => {
    let dibatalkan = false
    setData(null)
    setRalat(false)
    ambilStatistikMusim(musim.tarikh_mula, musim.tarikh_tamat)
      .then((d) => {
        if (!dibatalkan) setData(d)
      })
      .catch(() => {
        if (!dibatalkan) setRalat(true)
      })
    return () => {
      dibatalkan = true
    }
  }, [musim.id, musim.tarikh_mula, musim.tarikh_tamat, muatSemula])



  return (
    <div>
      {/* Season bar */}
      <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 ${kad}`}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{LABEL_JENIS[musim.jenis]}</p>
          <h2 className="text-lg font-semibold text-neutral-900">{musim.nama}</h2>
          <p className="text-sm text-neutral-500">
            {tarikhPendek(musim.tarikh_mula)} – {tarikhPendek(musim.tarikh_tamat)}
            {data && !data.belumMula && data.sehingga < musim.tarikh_tamat && (
              <span className="text-neutral-400"> · dikira sehingga hari ini</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={musim.id}
            onChange={(e) => {
              const m = senarai.find((x) => x.id === e.target.value)
              if (m) onTukar(m)
            }}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
          >
            {senarai.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
          <button
            onClick={() => eksport('pdf')}
            disabled={!bolehEksport}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {menjana === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {menjana === 'pdf' ? 'Menjana PDF...' : 'Muat Turun PDF'}
          </button>
          <button
            onClick={() => eksport('excel')}
            disabled={!bolehEksport}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {menjana === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {menjana === 'excel' ? 'Menjana Excel...' : 'Muat Turun Excel'}
          </button>
          <button
            onClick={() => setMuatSemula((n) => n + 1)}
            disabled={!data && !ralat}
            title="Kira semula"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Kira semula
          </button>
          <button
            onClick={onKembali}
            className="flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Senarai musim
          </button>
        </div>
      </div>

      {ralat ? (
        <div className={`mt-6 text-center ${kad}`}>
          <p className="text-sm font-medium text-red-600">Gagal mengira statistik musim.</p>
          <button
            onClick={() => setMuatSemula((n) => n + 1)}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Cuba lagi
          </button>
        </div>
      ) : !data ? (
        <RangkaStatistik />
      ) : data.belumMula ? (
        <div className={`mt-6 flex flex-col items-center gap-2 py-12 text-center ${kad}`}>
          <CalendarClock size={28} className="text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">Musim ini belum bermula.</p>
          <p className="text-xs text-neutral-400">Statistik akan dipaparkan mulai {tarikhPendek(musim.tarikh_mula)}.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KadAngka ikon={AlertTriangle} label="Bencana" nilai={nombor(data.ringkasan.bilBencana)} />
            <KadAngka ikon={FileText} label="Laporan" nilai={nombor(data.ringkasan.bilLaporan)} />
            <KadAngka ikon={MapPinned} label="Negeri" nilai={nombor(data.ringkasan.bilNegeri)} kecil="terjejas" />
            <KadAngka ikon={Users} label="Jumlah Mangsa" nilai={nombor(data.ringkasan.jumlahMangsa)} />
            <KadAngka ikon={Tent} label="Jumlah PPS" nilai={nombor(data.ringkasan.jumlahPps)} />
            <KadAngka ikon={Home} label="Jumlah KIR" nilai={nombor(data.ringkasan.jumlahKeluarga)} />
          </div>

          <Bahagian tajuk="Mangsa di PPS (harian)" ikon={Users}>
            <GrafHarian titik={data.harian} puncak={data.ringkasan.puncakMangsa} />
            <p className="mt-2 text-xs text-neutral-400">
              Bilangan mangsa di PPS pada akhir setiap hari (23:59). Jumlah musim dikira daripada bilangan tertinggi
              setiap PPS sepanjang musim, supaya mangsa yang tinggal beberapa hari tidak dikira berulang kali.
            </p>
          </Bahagian>

          <div className="grid gap-x-6 lg:grid-cols-2">
            <Bahagian tajuk="Mengikut Negeri" ikon={MapPinned}>
              <Jadual
                kepala={['Negeri', 'Bencana', 'Jumlah Mangsa', 'Jumlah PPS', 'Hari Aktif']}
                baris={data.ikutNegeri.map((n) => [n.negeri, n.bilBencana, n.jumlahMangsa, n.jumlahPps, n.hariAktif])}
                kosong="Tiada negeri terjejas."
              />
            </Bahagian>
            <Bahagian tajuk="Mengikut Jenis Bencana" ikon={AlertTriangle}>
              <Jadual
                kepala={['Jenis', 'Bencana', 'Jumlah Mangsa']}
                baris={data.ikutJenis.map((j) => [j.jenis, j.bilBencana, j.jumlahMangsa])}
                kosong="Tiada bencana dalam musim ini."
              />
            </Bahagian>
          </div>

          <Bahagian tajuk="Senarai Bencana" ikon={FileText}>
            <Jadual
              kepala={['Bencana', 'Jenis', 'Negeri', 'Laporan Pertama', 'Tamat', 'Tempoh (hari)', 'Jumlah Mangsa']}
              kananDari={5}
              baris={data.bencana.map((b) => [
                b.nama,
                b.jenis,
                b.negeri.join(', ') || '—',
                b.laporanPertama ? tarikhPendek(b.laporanPertama) : '—',
                b.tamatPada ? tarikhPendek(b.tamatPada) : 'Masih aktif',
                b.tempohHari ?? '—',
                b.jumlahMangsa,
              ])}
              kosong="Tiada bencana dalam musim ini."
            />
          </Bahagian>

          <Bahagian
            tajuk="Korban"
            ikon={HeartPulse}
            anak={
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Kematian {nombor(data.korban.kematian)}</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Cedera {nombor(data.korban.cedera)}</span>
                <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-neutral-700">Hilang {nombor(data.korban.hilang)}</span>
              </div>
            }
          >
            <Jadual
              kepala={['Negeri', 'Kematian', 'Cedera', 'Hilang']}
              baris={data.korban.ikutNegeri.map((k) => [k.negeri, k.kematian, k.cedera, k.hilang])}
              kosong="Tiada korban dilaporkan."
            />
            {data.korban.ikutNegeri.length > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                Dewasa: {nombor(data.korban.profil.dewasaLelaki)} lelaki, {nombor(data.korban.profil.dewasaPerempuan)} perempuan ·
                Kanak-kanak: {nombor(data.korban.profil.kanakLelaki)} lelaki, {nombor(data.korban.profil.kanakPerempuan)} perempuan
              </p>
            )}
          </Bahagian>

          <Bahagian
            tajuk="Mobilisasi"
            ikon={Truck}
            anak={
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                Kekuatan maksimum {nombor(data.mobilisasi.kekuatan)}
              </span>
            }
          >
            <Jadual
              kepala={['Agensi', 'Kekuatan', 'Aset Darat', 'Aset Air', 'Aset Udara']}
              baris={data.mobilisasi.ikutAgensi.map((a) => [a.agensi, a.kekuatan, a.darat, a.air, a.udara])}
              kosong="Tiada mobilisasi dilaporkan."
            />
            <p className="mt-2 text-xs text-neutral-400">
              Angka tertinggi yang dilaporkan bagi setiap agensi, bencana dan negeri sepanjang musim.
            </p>
          </Bahagian>

          <Bahagian tajuk="Kerosakan" ikon={Wrench}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">Infrastruktur Kerajaan</h3>
                <Jadual
                  kepala={['Kategori', 'Rosak', 'Musnah']}
                  baris={data.kerosakan.kerajaan.map((k) => [k.kategori, k.rosak, k.musnah])}
                  kosong="Tiada kerosakan dilaporkan."
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">Infrastruktur Swasta</h3>
                <Jadual
                  kepala={['Kategori', 'Rosak', 'Musnah']}
                  baris={data.kerosakan.swasta.map((k) => [k.kategori, k.rosak, k.musnah])}
                  kosong="Tiada kerosakan dilaporkan."
                />
              </div>
            </div>
            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-700">Pertanian, Akuakultur & Ternakan</h3>
            <Jadual
              kepala={['Kategori', 'Bil. Terlibat', 'Keluasan (ha)', 'Jumlah Terjejas']}
              baris={data.kerosakan.pertanian.map((p) => [p.kategori, p.bilTerlibat, p.kawasanHa, p.jumlahTerjejas])}
              kosong="Tiada kerosakan pertanian dilaporkan."
            />
          </Bahagian>

          <Bahagian
            tajuk="Jalan Ditutup"
            ikon={Construction}
            anak={
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                {nombor(data.jalan.jumlah)} jalan
              </span>
            }
          >
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">Mengikut Negeri</h3>
                <Jadual
                  kepala={['Negeri', 'Jalan']}
                  baris={data.jalan.ikutNegeri.map((j) => [j.negeri, j.bil])}
                  kosong="Tiada jalan ditutup."
                />
              </div>
              <div className="lg:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">Penutupan Paling Lama</h3>
                <Jadual
                  kepala={['Laluan', 'Negeri', 'Mula', 'Dibuka', 'Tempoh (jam)']}
                  kananDari={4}
                  baris={data.jalan.terpanjang.map((j) => [
                    j.lokasi ? `${j.nama} (${j.lokasi})` : j.nama,
                    j.negeri,
                    tarikhPendek(j.mula),
                    j.tamat ? tarikhPendek(j.tamat) : 'Belum dibuka',
                    j.jam,
                  ])}
                  kosong="Tiada jalan ditutup."
                />
              </div>
            </div>
          </Bahagian>
        </>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}