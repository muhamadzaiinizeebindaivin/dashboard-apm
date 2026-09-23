import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { JENIS_BENCANA_SEMASA } from '../lib/laporanBencana'
import type { ItemLaporanNasional } from '../lib/laporanNasional'
import type { TitikGraf } from '../lib/laporanNasionalGraf'
import petaMalaysia from '../assets/peta-malaysia.png'

// Same normalized (0–1) label-point positions used by the PDF map, taken
// from the source SVG's own label_points (viewBox 0 0 1000 332).
const NEGERI_NORM: Record<string, { x: number; y: number }> = {
  Sabah: { x: 0.8398, y: 0.3364 },
  Perlis: { x: 0.0734, y: 0.1663 },
  Kedah: { x: 0.0937, y: 0.2437 },
  Kelantan: { x: 0.1565, y: 0.357 },
  Perak: { x: 0.1086, y: 0.3874 },
  Sarawak: { x: 0.6986, y: 0.7226 },
  'Pulau Pinang': { x: 0.0831, y: 0.3195 },
  Selangor: { x: 0.1315, y: 0.597 },
  'Negeri Sembilan': { x: 0.1646, y: 0.6809 },
  Melaka: { x: 0.1703, y: 0.7506 },
  Johor: { x: 0.2192, y: 0.7898 },
  Pahang: { x: 0.1746, y: 0.5527 },
  Terengganu: { x: 0.1967, y: 0.3675 },
  Labuan: { x: 0.7666, y: 0.331 },
  'Kuala Lumpur': { x: 0.1403, y: 0.6352 },
  Putrajaya: { x: 0.1406, y: 0.665 },
}

const WARNA_HEX: Record<string, string> = {
  Ribut: '#3b8ed6',
  Banjir: '#2563eb',
  'Ombak Besar': '#14828c',
  Kebakaran: '#dc2626',
  'Tanah Runtuh': '#785428',
  Pencemaran: '#ca8a04',
  'Bangunan Runtuh': '#6b7280',
}

function warnaHex(jenis: string) {
  return WARNA_HEX[jenis] ?? '#6b7280'
}

function kiraPps(pps: string | null) {
  return pps ? pps.split('\n').filter((s) => s.trim()).length : 0
}

function bulatAtas(n: number, langkah: number) {
  return Math.max(langkah, Math.ceil(n / langkah) * langkah)
}

type SeriBar = { label: string; warna: string; nilai: number[] }
type SeriGaris = { label: string; warna: string; nilai: number[] }

function CartaGabungan({
  tajuk,
  kategori,
  bar1,
  bar2,
  garis,
}: {
  tajuk: string
  kategori: string[]
  bar1: SeriBar
  bar2: SeriBar
  garis: SeriGaris[]
}) {
  const w = 900
  const h = 260
  const px = 50
  const py = 30
  const pw = w - px - 40
  const ph = h - py - 45

  const maxBar = Math.max(1, ...bar1.nilai, ...bar2.nilai)
  const skalaKiri = bulatAtas(maxBar, maxBar > 100 ? 100 : 10)
  const maxGaris = Math.max(1, ...garis.flatMap((g) => g.nilai))
  const skalaKanan = bulatAtas(maxGaris, 1)

  const n = Math.max(1, kategori.length)
  const langkahX = pw / n
  const lebarBar = langkahX * 0.32

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      <text x={w / 2} y={16} textAnchor="middle" className="fill-neutral-700 text-[13px] font-bold">
        {tajuk}
      </text>
      <text x={px} y={py - 6} className="fill-neutral-500 text-[9px] font-semibold">
        BIL MANGSA
      </text>
      <text x={px + pw} y={py - 6} textAnchor="end" className="fill-neutral-500 text-[9px] font-semibold">
        BIL PPS
      </text>

      {[0, 1, 2, 3, 4].map((i) => {
        const gy = py + ph - (ph * i) / 4
        return (
          <g key={i}>
            <line x1={px} y1={gy} x2={px + pw} y2={gy} stroke="#e5e5e5" strokeWidth={1} />
            <text x={px - 4} y={gy + 3} textAnchor="end" className="fill-neutral-400 text-[8px]">
              {Math.round((skalaKiri * i) / 4)}
            </text>
            <text x={px + pw + 4} y={gy + 3} className="fill-neutral-400 text-[8px]">
              {Math.round((skalaKanan * i) / 4)}
            </text>
          </g>
        )
      })}

      {kategori.map((label, i) => {
        const tengahX = px + langkahX * i + langkahX / 2
        const b1 = bar1.nilai[i] ?? 0
        const b2 = bar2.nilai[i] ?? 0
        const t1 = (b1 / skalaKiri) * ph
        const t2 = (b2 / skalaKiri) * ph
        return (
          <g key={i}>
            <rect x={tengahX - lebarBar - 1} y={py + ph - t1} width={lebarBar} height={t1} fill={bar1.warna} />
            <rect x={tengahX + 1} y={py + ph - t2} width={lebarBar} height={t2} fill={bar2.warna} />
            {b1 > 0 && (
              <text
                x={tengahX - lebarBar / 2 - 1}
                y={py + ph - t1 - 4}
                textAnchor="middle"
                className="fill-neutral-700 text-[8px] font-bold"
              >
                {b1}
              </text>
            )}
            {b2 > 0 && (
              <text
                x={tengahX + lebarBar / 2 + 1}
                y={py + ph - t2 - 4}
                textAnchor="middle"
                className="fill-neutral-500 text-[8px] font-bold"
              >
                {b2}
              </text>
            )}
            <text x={tengahX} y={py + ph + 12} textAnchor="middle" className="fill-neutral-500 text-[7px]">
              {label}
            </text>
          </g>
        )
      })}

      {garis.map((g, gi) => {
        const titik = kategori.map((_, i) => {
          const tengahX = px + langkahX * i + langkahX / 2
          const nilai = g.nilai[i] ?? 0
          const gy = py + ph - (nilai / skalaKanan) * ph
          return [tengahX, gy] as [number, number]
        })
        return (
          <g key={gi}>
            <polyline points={titik.map((p) => p.join(',')).join(' ')} fill="none" stroke={g.warna} strokeWidth={1.5} />
            {titik.map(([tx, ty], i) => (
              <circle key={i} cx={tx} cy={ty} r={2.2} fill={g.warna} />
            ))}
          </g>
        )
      })}

      <g>
        {[bar1, bar2, ...garis].map((s, i) => {
          const xOffset = w / 2 - 140 + i * 90
          return (
            <g key={i}>
              <rect x={xOffset} y={h - 14} width={8} height={8} fill={s.warna} />
              <text x={xOffset + 11} y={h - 7} className="fill-neutral-600 text-[8px] font-semibold">
                {s.label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

type LaporanNasionalPreviewProps = {
  items: ItemLaporanNasional[]
  duaJam: TitikGraf[]
  harian: TitikGraf[]
  masaJana: Date
}

function jejakTitik(mulaX: number, mulaY: number, delta: [number, number][]): [number, number][] {
  const titik: [number, number][] = [[mulaX, mulaY]]
  let x = mulaX
  let y = mulaY
  for (const [dx, dy] of delta) {
    x += dx
    y += dy
    titik.push([x, y])
  }
  return titik
}

const p = (titik: [number, number][]) => titik.map(([x, y]) => `${x},${y}`).join(' ')

// Same simplified pictogram per disaster type as the PDF version, ported to SVG.
function IkonBencana({ jenis, cx, cy, r }: { jenis: string; cx: number; cy: number; r: number }) {
  const warna = warnaHex(jenis)
  const s = r * 0.55
  const w = Math.max(r * 0.16, 0.5)
  let glif: ReactNode = null

  switch (jenis) {
    case 'Ribut':
      glif = (
        <>
          <circle cx={cx - s * 0.35} cy={cy - s * 0.15} r={s * 0.42} fill="white" />
          <circle cx={cx + s * 0.3} cy={cy - s * 0.25} r={s * 0.5} fill="white" />
          <rect x={cx - s * 0.75} y={cy - s * 0.15} width={s * 1.5} height={s * 0.35} fill="white" />
          <polygon
            points={p(
              jejakTitik(cx - s * 0.05, cy + s * 0.2, [
                [s * 0.25, s * 0.35],
                [-s * 0.15, s * 0.05],
                [s * 0.2, s * 0.35],
              ]),
            )}
            fill="white"
          />
        </>
      )
      break
    case 'Banjir':
      glif = (
        <polyline
          points={p(
            jejakTitik(cx - s, cy, [
              [s * 0.5, -s * 0.4],
              [s * 0.5, s * 0.4],
              [s * 0.5, -s * 0.4],
              [s * 0.5, s * 0.4],
            ]),
          )}
          fill="none"
          stroke="white"
          strokeWidth={r * 0.22}
        />
      )
      break
    case 'Ombak Besar':
      glif = (
        <polyline
          points={p(
            jejakTitik(cx - s * 0.8, cy + s * 0.4, [
              [s * 0.6, -s * 0.9],
              [s * 0.5, s * 0.5],
              [s * 0.5, -s * 0.2],
            ]),
          )}
          fill="none"
          stroke="white"
          strokeWidth={r * 0.24}
        />
      )
      break
    case 'Kebakaran':
      glif = (
        <>
          <polygon
            points={`${cx},${cy - s * 1.05} ${cx - s * 0.8},${cy + s * 0.75} ${cx + s * 0.8},${cy + s * 0.75}`}
            fill="white"
          />
          <polygon
            points={`${cx},${cy - s * 0.15} ${cx - s * 0.35},${cy + s * 0.6} ${cx + s * 0.35},${cy + s * 0.6}`}
            fill={warna}
          />
        </>
      )
      break
    case 'Tanah Runtuh':
      glif = (
        <>
          <polygon
            points={`${cx - s * 0.5},${cy - s * 0.3} ${cx - s * 1.1},${cy + s * 0.7} ${cx + s * 0.1},${cy + s * 0.7}`}
            fill="white"
          />
          <polygon
            points={`${cx + s * 0.3},${cy - s * 0.7} ${cx - s * 0.2},${cy + s * 0.7} ${cx + s * 1.1},${cy + s * 0.7}`}
            fill="white"
          />
          <line x1={cx + s * 0.55} y1={cy - s * 0.85} x2={cx + s * 0.85} y2={cy - s * 0.5} stroke="white" strokeWidth={r * 0.12} />
        </>
      )
      break
    case 'Pencemaran':
      glif = (
        <>
          <polygon points={`${cx},${cy - s} ${cx - s},${cy} ${cx},${cy + s}`} fill="white" />
          <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s}`} fill="white" />
          <circle cx={cx} cy={cy} r={s * 0.22} fill={warna} />
        </>
      )
      break
    case 'Bangunan Runtuh':
      glif = (
        <>
          <rect x={cx - s * 0.7} y={cy - s * 0.8} width={s * 1.4} height={s * 1.6} fill="none" stroke="white" strokeWidth={r * 0.14} />
          <line x1={cx - s * 0.7} y1={cy} x2={cx + s * 0.7} y2={cy} stroke="white" strokeWidth={r * 0.14} />
          <line x1={cx - s * 0.15} y1={cy - s * 0.8} x2={cx - s * 0.15} y2={cy} stroke="white" strokeWidth={r * 0.14} />
          <line x1={cx + s * 0.15} y1={cy} x2={cx + s * 0.15} y2={cy + s * 0.8} stroke="white" strokeWidth={r * 0.14} />
          <line x1={cx - s * 0.85} y1={cy - s * 0.5} x2={cx + s * 0.85} y2={cy + s * 0.9} stroke="white" strokeWidth={r * 0.2} />
        </>
      )
      break
    default:
      break
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={warna} stroke="white" strokeWidth={w} />
      {glif}
    </g>
  )
}

// Direct port of the PDF map's layout algorithm: same outer-left / shared-middle
// (in the gap between Peninsular and Borneo) / outer-right column logic, same
// leader lines, same callout box shape — just drawn as SVG instead of jsPDF calls.
function PetaLaporan({ items, negeriAktif }: { items: ItemLaporanNasional[]; negeriAktif: string[] }) {
  const lebar = 297
  const margin = 14
  const kotakLebar = 32
  const jarakLuar = 3
  const nisbahPeta = 1000 / 332
  const petaLebar = lebar - margin * 2 - (kotakLebar + jarakLuar) * 2
  const petaTinggi = petaLebar / nisbahPeta
  const petaX = margin + kotakLebar + jarakLuar
  const petaY = 6

  const kotakTinggi = 5
  const lineTinggi = 2.6
  const langkah = kotakTinggi + 3 + 5 * lineTinggi + 2

  const xLuarKiri = margin
  const xTengah = petaX + 0.27 * petaLebar
  const xLuarKanan = lebar - margin - kotakLebar

  let yLuarKiri = petaY
  let yTengah = petaY
  let yLuarKanan = petaY
  let kiriGiliran = 0
  let kananGiliran = 0

  const elemen: ReactNode[] = []

  for (const negeri of negeriAktif) {
    const norm = NEGERI_NORM[negeri]
    if (!norm) continue
    const mx = petaX + norm.x * petaLebar
    const my = petaY + norm.y * petaTinggi

    const punya = items.filter((i) => i.negeri === negeri)
    const jenisUtama = punya[0]?.jenisBencana ?? ''
    const daerah = new Set(punya.filter((i) => i.daerah).map((i) => i.daerah))
    const pps = punya.reduce((n, i) => n + kiraPps(i.pps), 0)
    const keluarga = punya.reduce((n, i) => n + i.jumlahKeluarga, 0)
    const mangsa = punya.reduce((n, i) => n + i.jumlahMangsa, 0)
    const trend = punya.some((i) => i.trend === 'naik')
      ? 'NAIK'
      : punya.some((i) => i.trend === 'turun')
        ? 'TURUN'
        : 'KEKAL'

    const kiri = norm.x < 0.5
    let cx: number
    let cy: number
    let sisiKanan: boolean
    if (kiri) {
      const guna = kiriGiliran % 2 === 0 ? 'luar' : 'tengah'
      kiriGiliran++
      cx = guna === 'luar' ? xLuarKiri : xTengah
      cy = guna === 'luar' ? yLuarKiri : yTengah
      if (guna === 'luar') yLuarKiri += langkah
      else yTengah += langkah
      sisiKanan = guna === 'tengah'
    } else {
      const guna = kananGiliran % 2 === 0 ? 'luar' : 'tengah'
      kananGiliran++
      cx = guna === 'luar' ? xLuarKanan : xTengah
      cy = guna === 'luar' ? yLuarKanan : yTengah
      if (guna === 'luar') yLuarKanan += langkah
      else yTengah += langkah
      sisiKanan = guna === 'luar'
    }

    const garisX = sisiKanan ? cx : cx + kotakLebar

    elemen.push(
      <g key={negeri}>
        <line x1={mx} y1={my} x2={garisX} y2={cy + kotakTinggi / 2} stroke="#969696" strokeWidth={0.3} />
        <rect x={cx} y={cy} width={kotakLebar} height={kotakTinggi} rx={1.2} fill="#0b2a5c" />
        <text x={cx + kotakLebar / 2} y={cy + 3.6} textAnchor="middle" className="fill-white text-[3px] font-bold">
          {negeri.toUpperCase()}
        </text>
        <text x={cx} y={cy + kotakTinggi + 3} className="fill-neutral-700 text-[2.6px]">
          {`TREND : ${trend}`}
        </text>
        <text x={cx} y={cy + kotakTinggi + 3 + lineTinggi} className="fill-neutral-700 text-[2.6px]">
          {`DAERAH : ${daerah.size}`}
        </text>
        <text x={cx} y={cy + kotakTinggi + 3 + lineTinggi * 2} className="fill-neutral-700 text-[2.6px]">
          {`PPS : ${pps}`}
        </text>
        <text x={cx} y={cy + kotakTinggi + 3 + lineTinggi * 3} className="fill-neutral-700 text-[2.6px]">
          {`KELUARGA : ${keluarga}`}
        </text>
        <text x={cx} y={cy + kotakTinggi + 3 + lineTinggi * 4} className="fill-neutral-700 text-[2.6px]">
          {`MANGSA : ${mangsa}`}
        </text>
        <IkonBencana jenis={jenisUtama} cx={mx} cy={my} r={1.9} />
      </g>,
    )
  }

  const legendY = Math.max(petaY + petaTinggi, yLuarKiri, yTengah, yLuarKanan) + 6
  const tinggiSvg = legendY + 12

  return (
    <svg viewBox={`0 0 ${lebar} ${tinggiSvg}`} className="h-auto w-full">
      <image href={petaMalaysia} x={petaX} y={petaY} width={petaLebar} height={petaTinggi} />
      {elemen}
      <rect x={margin} y={legendY} width={lebar - margin * 2} height={10} rx={1} fill="#ebeef4" stroke="#b4b4b4" strokeWidth={0.3} />
      {JENIS_BENCANA_SEMASA.map((jenis, i) => (
        <g key={jenis} transform={`translate(${margin + 4 + i * 38}, 0)`}>
          <IkonBencana jenis={jenis} cx={0} cy={legendY + 5} r={2.6} />
          <text x={4} y={legendY + 6} className="fill-neutral-700 text-[3px] font-semibold">
            {jenis}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function LaporanNasionalPreview({ items, duaJam, harian, masaJana }: LaporanNasionalPreviewProps) {
  const negeriSet = new Set(items.map((i) => i.negeri).filter(Boolean))
  const daerahSet = new Set(items.filter((i) => i.daerah).map((i) => `${i.negeri}|${i.daerah}`))
  const ppsCount = items.reduce((n, i) => n + kiraPps(i.pps), 0)
  const jumlahMangsa = items.reduce((n, i) => n + i.jumlahMangsa, 0)
  const jumlahKeluarga = items.reduce((n, i) => n + i.jumlahKeluarga, 0)

  const kaunter = [
    { label: 'Negeri', nilai: negeriSet.size },
    { label: 'Daerah', nilai: daerahSet.size },
    { label: 'Pusat Pemindahan', nilai: ppsCount },
    { label: 'Keluarga', nilai: jumlahKeluarga },
    { label: 'Mangsa', nilai: jumlahMangsa },
  ]

  const negeriAktif = [...new Set(items.map((i) => i.negeri).filter((n): n is string => !!n))]

  const jenisAda = [...new Set(items.map((i) => i.jenisBencana))]
  const jenisSet = [
    ...JENIS_BENCANA_SEMASA.filter((j) => jenisAda.includes(j)),
    ...jenisAda.filter((j) => !JENIS_BENCANA_SEMASA.includes(j)),
  ]

  const tarikh = masaJana.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
  const masa = `${String(masaJana.getHours()).padStart(2, '0')}${String(masaJana.getMinutes()).padStart(2, '0')}H`

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[#0b2a5c] px-6 py-5 text-center text-white">
        <p className="text-xs font-semibold tracking-wide">ANGKATAN PERTAHANAN AWAM MALAYSIA</p>
        <p className="mt-1 text-xl font-bold text-amber-400">LAPORAN BENCANA NASIONAL</p>
        <p className="mt-1 text-sm">{tarikh.toUpperCase()}</p>
        <p className="text-xs text-white/80">KEMASKINI SEHINGGA {masa}</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Jumlah Keseluruhan</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kaunter.map((k) => (
            <div key={k.label} className="rounded-xl bg-[#0b2a5c] px-3 py-3 text-center text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">{k.label}</p>
              <p className="mt-1 text-xl font-bold">{k.nilai}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Peta Bencana</h3>
        <div className="rounded-xl border border-neutral-100 bg-white/70 p-3">
          <PetaLaporan items={items} negeriAktif={negeriAktif} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[31%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="bg-neutral-900 text-xs uppercase text-white">
              <th className="px-3 py-2 font-medium">Zon</th>
              <th className="px-3 py-2 font-medium">Negeri</th>
              <th className="px-3 py-2 font-medium">Daerah</th>
              <th className="px-3 py-2 font-medium">PPS</th>
              <th className="px-3 py-2 text-center font-medium">Mangsa</th>
              <th className="px-3 py-2 text-center font-medium">Keluarga</th>
            </tr>
          </thead>
          <tbody>
            {jenisSet.map((jenis) => {
              const dalamJenis = items.filter((i) => i.jenisBencana === jenis)
              const zonSet = [...new Set(dalamJenis.map((i) => i.zon ?? '—'))]
              return (
                <Fragment key={jenis}>
                  <tr>
                    <td
                      colSpan={6}
                      className="bg-[#b8c6d9] px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-[#0b2a5c]"
                    >
                      {jenis}
                    </td>
                  </tr>
                  {zonSet.map((zon) => {
                    const dalamZon = dalamJenis.filter((i) => (i.zon ?? '—') === zon)
                    const subMangsa = dalamZon.reduce((n, i) => n + i.jumlahMangsa, 0)
                    const subKeluarga = dalamZon.reduce((n, i) => n + i.jumlahKeluarga, 0)
                    const subPps = dalamZon.reduce((n, i) => n + kiraPps(i.pps), 0)
                    return (
                      <Fragment key={zon}>
                        {dalamZon.map((i, idx) => (
                          <tr key={idx} className="border-b border-neutral-100">
                            {idx === 0 && (
                              <td rowSpan={dalamZon.length} className="px-3 py-2 align-top font-medium text-neutral-700">
                                ZON {zon}
                              </td>
                            )}
                            <td className="px-3 py-2 text-neutral-800">{i.negeri ?? '—'}</td>
                            <td className="px-3 py-2 text-neutral-800">{i.daerah ?? '—'}</td>
                            <td className="px-3 py-2 whitespace-pre-wrap text-neutral-800">{i.pps ?? '—'}</td>
                            <td className="px-3 py-2 text-center text-neutral-800">{i.jumlahMangsa}</td>
                            <td className="px-3 py-2 text-center text-neutral-800">{i.jumlahKeluarga}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#0b2a5c] font-semibold text-white">
                          <td colSpan={6} className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5">
                              <span>JUMLAH KESELURUHAN</span>
                              <span>PPS: {subPps}</span>
                              <span>Mangsa: {subMangsa}</span>
                              <span>Keluarga: {subKeluarga}</span>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white">
        <span>JUMLAH KESELURUHAN</span>
        <span>PPS: {ppsCount}</span>
        <span>Mangsa: {jumlahMangsa}</span>
        <span>Keluarga: {jumlahKeluarga}</span>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Graf Laporan Bencana</h3>
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-white/70 p-3">
          <CartaGabungan
            tajuk="GRAF LAPORAN BENCANA SETIAP 2 JAM"
            kategori={duaJam.map((t) => t.label)}
            bar1={{ label: 'KELUARGA', warna: '#d97706', nilai: duaJam.map((t) => t.keluarga) }}
            bar2={{ label: 'MANGSA', warna: '#2563eb', nilai: duaJam.map((t) => t.mangsa) }}
            garis={[{ label: 'PPS', warna: '#16a34a', nilai: duaJam.map((t) => t.pps) }]}
          />
          <CartaGabungan
            tajuk="GRAF LAPORAN BENCANA HARIAN (7 HARI)"
            kategori={harian.map((t) => t.label)}
            bar1={{ label: 'MANGSA', warna: '#f97316', nilai: harian.map((t) => t.mangsa) }}
            bar2={{ label: 'KELUARGA', warna: '#eab308', nilai: harian.map((t) => t.keluarga) }}
            garis={[
              { label: 'PPS', warna: '#2563eb', nilai: harian.map((t) => t.pps) },
              { label: 'NEGERI', warna: '#78716c', nilai: harian.map((t) => t.negeri) },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
