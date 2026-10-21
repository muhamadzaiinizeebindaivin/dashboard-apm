import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Users, Tent, Home, MapPin, Activity, FileText, Inbox } from 'lucide-react'
import { PetaBencana } from './PetaBencana'
import type { PpsPeta } from './PetaBencana'
import { dataTerkiniTitik, ikonKategori, warnaSelamat } from '../lib/titikBencana'
import { HAD_TIADA_KEMASKINI_JAM } from '../lib/ppsPusat'
import { useLaporanTerkini, usePetaAwam, useTrendMangsa } from '../lib/petaAwam'
import type { PpsAwam, TitikTrend } from '../lib/petaAwam'

// Laman Utama dashboard (public page and logged-in home): the Peta Bencana in
// display-only mode with floating figures, and three cards underneath.
// Palette of this page: white glass, blue / navy, orange highlights.
// Editing stays in the Bencana tab.

const NAVY = '#0b2a5c'
const BIRU = '#2563eb'
const OREN = '#f97316'
const KELABU = '#94a3b8'

const nombor = (n: number) => n.toLocaleString('ms-MY')

const masaLalu = (iso: string) => {
  const minit = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minit < 1) return 'baru sahaja'
  if (minit < 60) return `${minit} minit lalu`
  const jam = Math.round(minit / 60)
  if (jam < 24) return `${jam} jam lalu`
  return `${Math.round(jam / 24)} hari lalu`
}

const kad = 'rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_rgba(11,42,92,0.08)] backdrop-blur-md'

// ---------------------------------------------------------------------------
// Floating figure, as a round glass bubble over the map
// ---------------------------------------------------------------------------
type GelembungProps = { ikon: LucideIcon; nilai: string; label: string; warna: string; className?: string }

function Gelembung({ ikon: Ikon, nilai, label, warna, className = '' }: GelembungProps) {
  return (
    <div
      className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full bg-white/80 text-center shadow-[0_10px_30px_rgba(11,42,92,0.18)] ring-1 ring-white backdrop-blur-md ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${warna}1a` }}>
        <Ikon size={15} style={{ color: warna }} />
      </span>
      <p className="mt-1 text-2xl font-bold leading-none tabular-nums" style={{ color: NAVY }}>
        {nilai}
      </p>
      <p className="mt-1 px-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-500">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card 1: victims over time
// ---------------------------------------------------------------------------
function laluan(titik: [number, number][]) {
  if (titik.length === 0) return ''
  return titik
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`
      const [x0, y0] = titik[i - 1]
      const xm = (x0 + x) / 2
      return `C ${xm} ${y0}, ${xm} ${y}, ${x} ${y}`
    })
    .join(' ')
}

function GrafTrend({ data, tempoh }: { data: TitikTrend[]; tempoh: '24j' | '7h' }) {
  const W = 320
  const H = 130
  const atas = 10
  const bawah = H - 18
  const max = Math.max(1, ...data.map((d) => Math.max(d.mangsa, d.keluarga)))
  const x = (i: number) => (data.length <= 1 ? W / 2 : (i / (data.length - 1)) * W)
  const y = (v: number) => bawah - (v / max) * (bawah - atas)

  const titikMangsa = data.map((d, i): [number, number] => [x(i), y(d.mangsa)])
  const titikKeluarga = data.map((d, i): [number, number] => [x(i), y(d.keluarga)])
  const garis = laluan(titikMangsa)
  const kawasan = garis ? `${garis} L ${W} ${bawah} L 0 ${bawah} Z` : ''

  const label = (iso: string) => {
    const t = new Date(iso)
    return tempoh === '24j'
      ? `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
      : `${t.getDate()}/${t.getMonth() + 1}`
  }
  const indeksLabel = data.length > 1 ? [0, Math.round((data.length - 1) / 3), Math.round(((data.length - 1) * 2) / 3), data.length - 1] : [0]
  const akhir = titikMangsa[titikMangsa.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full overflow-visible" role="img" aria-label="Graf trend mangsa">
      <defs>
        <linearGradient id="kawasan-mangsa" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={BIRU} stopOpacity="0.28" />
          <stop offset="100%" stopColor={BIRU} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={atas + (bawah - atas) * f} y2={atas + (bawah - atas) * f} stroke="#e2e8f0" strokeDasharray="3 4" />
      ))}
      {kawasan && <path d={kawasan} fill="url(#kawasan-mangsa)" />}
      {titikKeluarga.length > 1 && (
        <path d={laluan(titikKeluarga)} fill="none" stroke={OREN} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
      )}
      {garis && <path d={garis} fill="none" stroke={BIRU} strokeWidth="2.75" strokeLinecap="round" />}
      {akhir && (
        <>
          <circle cx={akhir[0]} cy={akhir[1]} r="7" fill={BIRU} opacity="0.18" />
          <circle cx={akhir[0]} cy={akhir[1]} r="3.5" fill="#fff" stroke={BIRU} strokeWidth="2" />
        </>
      )}
      {indeksLabel.map((i, n) =>
        data[i] ? (
          <text
            key={`${i}-${n}`}
            x={x(i)}
            y={H - 2}
            fontSize="9"
            fill="#94a3b8"
            textAnchor={n === 0 ? 'start' : n === indeksLabel.length - 1 ? 'end' : 'middle'}
          >
            {label(data[i].masa)}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function KadTrend() {
  const [tempoh, setTempoh] = useState<'24j' | '7h'>('24j')
  const data = useTrendMangsa(tempoh)
  const kini = data[data.length - 1]
  const mula = data[0]
  const beza = kini && mula ? kini.mangsa - mula.mangsa : 0

  return (
    <div className={kad}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            Trend Mangsa
          </h3>
          <p className="text-xs text-neutral-500">Mangsa di PPS dibuka</p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold">
          {(['24j', '7h'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTempoh(t)}
              className={`rounded-full px-3 py-1 transition-colors ${
                tempoh === t ? 'bg-white text-[#0b2a5c] shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === '24j' ? '24 JAM' : '7 HARI'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <p className="text-3xl font-bold tabular-nums" style={{ color: NAVY }}>
          {nombor(kini?.mangsa ?? 0)}
        </p>
        {beza !== 0 && (
          <span
            className="mb-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: beza > 0 ? `${OREN}1a` : `${BIRU}1a`, color: beza > 0 ? OREN : BIRU }}
          >
            {beza > 0 ? '▲' : '▼'} {nombor(Math.abs(beza))}
          </span>
        )}
      </div>

      {data.length > 0 ? (
        <GrafTrend data={data} tempoh={tempoh} />
      ) : (
        <div className="flex h-36 items-center justify-center text-xs text-neutral-400">Tiada data</div>
      )}

      <div className="mt-1 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: BIRU }} /> Mangsa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: OREN }} /> Keluarga
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card 2: status of the open PPS, as a ring
// ---------------------------------------------------------------------------
function KadStatusPps({ pps }: { pps: PpsAwam[] }) {
  const had = HAD_TIADA_KEMASKINI_JAM * 3_600_000
  const kini = Date.now()
  const senyap = (p: PpsAwam) => p.status === 'dibuka' && kini - new Date(p.dilapor_pada ?? p.dibuka_pada).getTime() > had

  const bahagian = [
    { label: 'Dibuka', nilai: pps.filter((p) => p.status === 'dibuka' && !senyap(p)).length, warna: BIRU },
    { label: 'Cadangan tutup', nilai: pps.filter((p) => p.status === 'cadangan_tutup').length, warna: OREN },
    { label: `Tiada kemas kini (> ${HAD_TIADA_KEMASKINI_JAM} j)`, nilai: pps.filter(senyap).length, warna: KELABU },
  ]
  const jumlah = bahagian.reduce((n, b) => n + b.nilai, 0)

  const r = 52
  const lilitan = 2 * Math.PI * r
  let ofset = 0

  return (
    <div className={kad}>
      <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
        Status PPS
      </h3>
      <p className="text-xs text-neutral-500">Pusat pemindahan yang belum ditutup</p>

      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Status PPS">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eef2f7" strokeWidth="14" />
          {jumlah > 0 &&
            bahagian.map((b) => {
              const panjang = (b.nilai / jumlah) * lilitan
              const el = (
                <circle
                  key={b.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={b.warna}
                  strokeWidth="14"
                  strokeDasharray={`${panjang} ${lilitan - panjang}`}
                  strokeDashoffset={-ofset}
                />
              )
              ofset += panjang
              return el
            })}
          <text
            x="70"
            y="70"
            transform="rotate(90 70 70)"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fontWeight="700"
            fill={NAVY}
          >
            {jumlah}
          </text>
          <text x="70" y="94" transform="rotate(90 70 70)" textAnchor="middle" fontSize="10" fill="#94a3b8">
            PPS
          </text>
        </svg>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {bahagian.map((b) => (
            <li key={b.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-neutral-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.warna }} />
                <span className="truncate">{b.label}</span>
              </span>
              <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                {b.nilai}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card 3: latest reports received
// ---------------------------------------------------------------------------
function KadLaporanTerkini() {
  const senarai = useLaporanTerkini(5)

  return (
    <div className={kad}>
      <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
        Laporan Terkini
      </h3>
      <p className="text-xs text-neutral-500">Laporan Awal dan Semasa yang diterima</p>

      {senarai.length === 0 ? (
        <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-xs text-neutral-400">
          <Inbox size={22} />
          Tiada laporan
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {senarai.map((l) => {
            const awal = l.jenis_laporan === 'awal'
            return (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: awal ? `${OREN}1a` : `${BIRU}1a`, color: awal ? OREN : BIRU }}
                >
                  <FileText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold" style={{ color: NAVY }}>
                    {l.nama_bencana || l.jenis_bencana || 'Laporan'}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {awal ? 'Laporan Awal' : 'Laporan Semasa'}
                    {l.negeri && ` · ${l.negeri}`}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-neutral-400">{masaLalu(l.created_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page block
// ---------------------------------------------------------------------------
export function PapanUtama() {
  const { kategori, titik, pps, jalan, ringkasan, bencana, loading } = usePetaAwam()

  const petaKategori = Object.fromEntries(kategori.map((k) => [k.key, k]))
  const terkini = Object.fromEntries(
    titik.flatMap((t) => {
      const d = dataTerkiniTitik(t, ringkasan)
      return d ? [[t.id, d] as const] : []
    }),
  )
  const ppsPeta = pps.filter((p): p is PpsAwam & { latitude: number; longitude: number } => p.latitude != null && p.longitude != null) as PpsPeta[]

  // Figures of the bubbles (same rules as the banner and the Laporan Nasional)
  const mangsa = bencana.reduce((n, b) => n + b.mangsa, 0)
  const ppsDibuka = bencana.reduce((n, b) => n + b.pps_dibuka, 0)
  const keluarga =
    pps.reduce((n, p) => n + (p.jumlah_keluarga ?? 0), 0) +
    titik.filter((t) => !t.nama_bencana).reduce((n, t) => n + (t.jumlah_kir ?? 0), 0)
  const negeri = new Set(bencana.flatMap((b) => b.negeri))

  const gelembung: GelembungProps[] = [
    { ikon: AlertTriangle, nilai: nombor(bencana.length), label: 'Bencana aktif', warna: OREN },
    { ikon: Users, nilai: nombor(mangsa), label: 'Mangsa', warna: BIRU },
    { ikon: Tent, nilai: nombor(ppsDibuka), label: 'PPS dibuka', warna: BIRU },
    { ikon: Home, nilai: nombor(keluarga), label: 'Keluarga', warna: OREN },
    { ikon: MapPin, nilai: nombor(negeri.size), label: 'Negeri terjejas', warna: BIRU },
  ]

  // Legend: only the categories present on the map
  const kategoriAda = kategori.filter((k) => titik.some((t) => t.kategori === k.key))

  return (
    <div className="space-y-4">
      {/* Map with floating figures */}
      {/* `isolate` keeps Leaflet's z-indexes inside this box, so the mobile menu and modals stay above the map */}
      <div className="relative isolate h-[420px] overflow-hidden rounded-3xl border border-white/70 shadow-[0_20px_60px_rgba(11,42,92,0.15)] sm:h-[480px] lg:h-[560px]">
        <PetaBencana
          titik={titik}
          terkini={terkini}
          kategori={petaKategori}
          pps={ppsPeta}
          paras={[]}
          jalan={jalan}
          lapisan={{ titik: true, pps: true, paras: false, jalan: true }}
          negeriFokus=""
          zoomRoda={false}
        />

        <div className="pointer-events-none absolute left-4 top-4 z-[600] flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 shadow-md backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: OREN }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: OREN }} />
          </span>
          <span className="text-xs font-semibold" style={{ color: NAVY }}>
            Peta Bencana · Masa nyata
          </span>
          {loading && <Activity size={13} className="animate-pulse text-neutral-400" />}
        </div>

        {/* Floating bubbles: large screens; smaller screens get a row under the map */}
        <div className="pointer-events-none absolute inset-x-0 top-16 z-[600] hidden justify-center gap-4 xl:flex">
          {gelembung.map((g, i) => (
            <Gelembung key={g.label} {...g} className={i % 2 === 1 ? 'translate-y-6' : ''} />
          ))}
        </div>

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-[600] max-w-[60%] rounded-2xl bg-white/85 px-3 py-2.5 text-[11px] shadow-md backdrop-blur-md">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-neutral-600">
            {kategoriAda.map((k) => {
              const Ikon = ikonKategori(k.ikon)
              return (
                <span key={k.key} className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: warnaSelamat(k.warna) }}>
                    <Ikon size={9} color="#fff" />
                  </span>
                  {k.label}
                </span>
              )
            })}
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: '#16a34a' }} /> PPS
            </span>
            {jalan.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-[3px] border-2 border-white bg-orange-600 shadow" /> Jalan ditutup
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Figures under the map on smaller screens */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:hidden">
        {gelembung.map((g) => {
          const Ikon = g.ikon
          return (
            <div key={g.label} className={`${kad} flex items-center gap-3 !p-4`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${g.warna}1a` }}>
                <Ikon size={17} style={{ color: g.warna }} />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none tabular-nums" style={{ color: NAVY }}>
                  {g.nilai}
                </p>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{g.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <KadTrend />
        <KadStatusPps pps={pps} />
        <KadLaporanTerkini />
      </div>
    </div>
  )
}