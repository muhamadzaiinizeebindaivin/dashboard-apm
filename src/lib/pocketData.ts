import { supabase } from './supabase'
import { ambilSemua } from './ambilSemua'
import { ambilKorbanSemasa, ambilLaporanNasional } from './laporanNasional'
import type { ItemLaporanNasional } from './laporanNasional'
import { ahliKumpulan, kumpulanNegeri, samaKumpulan } from './kumpulanNegeri'
import { hurufBesar } from './normalisasi'
import { JENIS_KENDERAAN, JENIS_LABEL, normalKeadaan } from './kenderaanVisual'
import type { Keadaan } from './kenderaanVisual'
import { STATUS_LIST } from './sumbanganStatus'
import type { SumbanganStatus } from './sumbanganStatus'

// Pocket Data: one summary of the current situation (Bencana, Personel, Logistik, Bantuan)
// for a scope: whole country / a state / a district, optionally a Parlimen or ADUN.
// PKON: the database only returns their state; the page also locks the Negeri filter.

export type PoketId = 'bencana' | 'personel' | 'logistik' | 'bantuan'

export const SENARAI_POKET: { id: PoketId; label: string; huraian: string }[] = [
  { id: 'bencana', label: 'Bencana', huraian: 'Status semasa & PPS' },
  { id: 'personel', label: 'Personel', huraian: 'Aktif & simpanan' },
  { id: 'logistik', label: 'Logistik', huraian: 'Status kenderaan' },
  { id: 'bantuan', label: 'Bantuan', huraian: 'NGO, CDA & lain-lain' },
]

export type TapisanPoket = {
  negeri: string // '' = seluruh Malaysia (PKOP only)
  daerah: string // uppercase, '' = every district
  parlimen: string
  dun: string
  poket: PoketId[]
}

export type Kiraan = { baik: number; selenggara: number; rosak: number; jumlah: number }
export type BarisKiraan = Kiraan & { nama: string }
const kiraanKosong = (): Kiraan => ({ baik: 0, selenggara: 0, rosak: 0, jumlah: 0 })

export type PoketBencana = {
  bencanaAktif: number
  pps: number
  mangsa: number
  keluarga: number
  daerahTerjejas: number
  // State-level figures: null when a district or a Parlimen/ADUN is chosen
  korban: { kematian: number; kecederaan: number; hilang: number } | null
  senaraiBencana: { nama: string; jenis: string; negeri: string; pps: number; mangsa: number; keluarga: number }[]
  ikutDaerah: { negeri: string; daerah: string; pps: number; mangsa: number; keluarga: number }[]
}

export type PoketLogistik = {
  jumlah: Kiraan
  ikutJenis: BarisKiraan[]
  tajukKawasan: 'Negeri' | 'Daerah'
  ikutKawasan: BarisKiraan[]
  // Vehicles not ready (Selenggara / Rosak): listed only when one state is chosen
  tidakSedia: { plat: string; nama: string; jenis: string; daerah: string; keadaan: Keadaan; catatan: string }[] | null
}

export type PoketBantuan = {
  jumlah: number
  ikutStatus: Record<SumbanganStatus, number>
  ikutKumpulan: { nama: string; jumlah: number; terima: number }[]
  ikutJenis: { nama: string; jumlah: number }[]
  ikutNegeri: { nama: string; jumlah: number; terima: number }[] | null // national scope only
  jumlahNgo: number
}

export type DataPoket = {
  tapisan: TapisanPoket
  dijanaPada: string // ISO
  bencana?: PoketBencana
  logistik?: PoketLogistik
  bantuan?: PoketBantuan | null // null = the donation data could not be read
}

export const peratus = (n: number, jumlah: number) => (jumlah ? Math.round((n / jumlah) * 1000) / 10 : 0)

const jumlahkan = <T>(arr: T[], f: (x: T) => number) => arr.reduce((n, x) => n + f(x), 0)
const adaKawasan = (t: TapisanPoket) => !!(t.parlimen || t.dun)

// "PERAK · DAERAH KINTA · P.062 SUNGAI SIPUT"
export function labelSkop(t: Pick<TapisanPoket, 'negeri' | 'daerah' | 'parlimen' | 'dun'>): string {
  const bahagian = [t.negeri ? t.negeri.toUpperCase() : 'SELURUH MALAYSIA']
  if (t.daerah) bahagian.push(`DAERAH ${t.daerah.toUpperCase()}`)
  if (t.parlimen) bahagian.push(t.parlimen.toUpperCase())
  if (t.dun) bahagian.push(t.dun.toUpperCase())
  return bahagian.join(' · ')
}

// Notes printed on the summary (what each filter does and does not cover)
export function notaSkop(t: TapisanPoket): string[] {
  const nota = ['Data ialah keadaan semasa pada masa pocket data ini dijana.']
  const peringkat = t.daerah ? 'daerah' : t.negeri ? 'negeri' : 'nasional'
  if (adaKawasan(t) && (t.poket.includes('logistik') || t.poket.includes('bantuan'))) {
    nota.push(`Penapis Parlimen/ADUN digunakan pada data Bencana sahaja; Logistik dan Bantuan dipaparkan pada peringkat ${peringkat}.`)
  }
  if (t.daerah && t.poket.includes('bantuan')) {
    nota.push('Data Bantuan direkodkan mengikut negeri, jadi dipaparkan pada peringkat negeri.')
  }
  if (t.poket.includes('bencana') && (t.daerah || adaKawasan(t))) {
    nota.push('Korban (kematian, cedera, hilang) dilaporkan pada peringkat negeri dan tidak dipaparkan bagi skop ini.')
  }
  return nota
}

// Districts to choose from for a state: open PPS + vehicles
export async function ambilPilihanDaerah(negeri: string): Promise<string[]> {
  if (!negeri) return []
  const ahli = ahliKumpulan(negeri)
  const [pps, kenderaan] = await Promise.all([
    supabase.from('pps_pusat').select('daerah').in('negeri', ahli).neq('status', 'ditutup'),
    supabase.from('logistik_kenderaan').select('daerah').in('negeri', ahli).not('daerah', 'is', null),
  ])
  const semua = [...(pps.data ?? []), ...(kenderaan.data ?? [])]
    .map((r) => (r as { daerah: string | null }).daerah)
    .filter((d): d is string => !!d?.trim())
    .map(hurufBesar)
  return [...new Set(semua)].sort((a, b) => a.localeCompare(b))
}

// --- Bencana ---

async function ambilBencana(t: TapisanPoket): Promise<PoketBencana> {
  const lulusKawasan = (p: { parlimen: string | null; dun: string | null }) =>
    (!t.parlimen || p.parlimen === t.parlimen) && (!t.dun || p.dun === t.dun)
  const bilPps = (i: ItemLaporanNasional) =>
    i.ppsButiran ? i.ppsButiran.length : (i.pps ?? '').split('\n').filter((s) => s.trim()).length

  const items = (await ambilLaporanNasional())
    .filter((i) => !i.tamatPada)
    .filter((i) => !t.negeri || samaKumpulan(i.negeri, t.negeri))
    .filter((i) => !t.daerah || hurufBesar(i.daerah ?? '') === t.daerah)
    .flatMap((i): ItemLaporanNasional[] => {
      if (!adaKawasan(t)) return [i]
      // Same rule as the Laporan Nasional: keep only the PPS in that constituency
      const pilih = (i.ppsButiran ?? []).filter(lulusKawasan)
      if (pilih.length === 0) return []
      return [
        {
          ...i,
          ppsButiran: pilih,
          jumlahMangsa: jumlahkan(pilih, (p) => p.jumlahMangsa),
          jumlahKeluarga: jumlahkan(pilih, (p) => p.jumlahKeluarga),
        },
      ]
    })

  type B = { nama: string; jenis: string; negeri: Set<string>; pps: number; mangsa: number; keluarga: number }
  const ikutBencana = new Map<string, B>()
  const ikutDaerah = new Map<string, PoketBencana['ikutDaerah'][number]>()

  for (const i of items) {
    const nama = i.namaBencana.trim()
    const b = ikutBencana.get(nama) ?? { nama, jenis: i.jenisBencana, negeri: new Set<string>(), pps: 0, mangsa: 0, keluarga: 0 }
    if (i.negeri) b.negeri.add(kumpulanNegeri(i.negeri))
    b.pps += bilPps(i)
    b.mangsa += i.jumlahMangsa
    b.keluarga += i.jumlahKeluarga
    ikutBencana.set(nama, b)

    if (i.daerah && bilPps(i) > 0) {
      const daerah = hurufBesar(i.daerah)
      const kunci = `${i.negeri}|${daerah}`
      const d = ikutDaerah.get(kunci) ?? { negeri: i.negeri ?? '', daerah, pps: 0, mangsa: 0, keluarga: 0 }
      d.pps += bilPps(i)
      d.mangsa += i.jumlahMangsa
      d.keluarga += i.jumlahKeluarga
      ikutDaerah.set(kunci, d)
    }
  }

  let korban: PoketBencana['korban'] = null
  if (!t.daerah && !adaKawasan(t)) {
    try {
      const aktif = new Set(ikutBencana.keys())
      const k = (await ambilKorbanSemasa()).filter(
        (x) => aktif.has(x.nama_bencana.trim()) && (!t.negeri || samaKumpulan(x.negeri, t.negeri)),
      )
      korban = {
        kematian: jumlahkan(k, (x) => x.kematian),
        kecederaan: jumlahkan(k, (x) => x.kecederaan),
        hilang: jumlahkan(k, (x) => x.hilang),
      }
    } catch {
      korban = null
    }
  }

  const daerahList = [...ikutDaerah.values()].sort((a, b) => b.mangsa - a.mangsa)

  return {
    bencanaAktif: ikutBencana.size,
    pps: jumlahkan(items, bilPps),
    mangsa: jumlahkan(items, (i) => i.jumlahMangsa),
    keluarga: jumlahkan(items, (i) => i.jumlahKeluarga),
    daerahTerjejas: daerahList.length,
    korban,
    senaraiBencana: [...ikutBencana.values()]
      .map((b) => ({ ...b, negeri: [...b.negeri].join(', ') }))
      .sort((a, b) => b.mangsa - a.mangsa),
    ikutDaerah: daerahList,
  }
}

// --- Logistik ---

type BarisKenderaan = {
  nama_kenderaan: string
  nombor_plat: string
  jenis_kenderaan: string
  keadaan: string
  keterangan_kerosakan: string | null
  negeri: string | null
  daerah: string | null
}

async function ambilLogistik(t: TapisanPoket): Promise<PoketLogistik> {
  const rows = await ambilSemua<BarisKenderaan>(() => {
    let q = supabase
      .from('logistik_kenderaan')
      .select('id, nama_kenderaan, nombor_plat, jenis_kenderaan, keadaan, keterangan_kerosakan, negeri, daerah')
    if (t.negeri) q = q.in('negeri', ahliKumpulan(t.negeri))
    if (t.daerah) q = q.eq('daerah', t.daerah)
    return q.order('id')
  })

  const ikutDaerah = !!t.negeri // one state: by district; whole country: by state
  const jumlah = kiraanKosong()
  const jenisMap = new Map<string, Kiraan>()
  const kawasanMap = new Map<string, Kiraan>()
  const tambah = (c: Kiraan, k: Keadaan) => {
    c[k]++
    c.jumlah++
  }

  for (const r of rows) {
    const k = normalKeadaan(r.keadaan)
    tambah(jumlah, k)
    if (!jenisMap.has(r.jenis_kenderaan)) jenisMap.set(r.jenis_kenderaan, kiraanKosong())
    tambah(jenisMap.get(r.jenis_kenderaan)!, k)
    const kawasan = ikutDaerah ? r.daerah || 'TIADA DAERAH' : kumpulanNegeri(r.negeri) || 'TIADA NEGERI'
    if (!kawasanMap.has(kawasan)) kawasanMap.set(kawasan, kiraanKosong())
    tambah(kawasanMap.get(kawasan)!, k)
  }

  const jenisDikenali: string[] = JENIS_KENDERAAN.map((j) => j.value)
  const ikutJenis = [...jenisDikenali, ...[...jenisMap.keys()].filter((j) => !jenisDikenali.includes(j))]
    .filter((j) => jenisMap.has(j))
    .map((j) => ({ nama: JENIS_LABEL[j] ?? j, ...jenisMap.get(j)! }))

  const urutan: Record<Keadaan, number> = { rosak: 0, selenggara: 1, baik: 2 }
  const tidakSedia = ikutDaerah
    ? rows
        .filter((r) => normalKeadaan(r.keadaan) !== 'baik')
        .map((r) => ({
          plat: r.nombor_plat,
          nama: r.nama_kenderaan,
          jenis: JENIS_LABEL[r.jenis_kenderaan] ?? r.jenis_kenderaan,
          daerah: r.daerah || '-',
          keadaan: normalKeadaan(r.keadaan),
          catatan: r.keterangan_kerosakan ?? '',
        }))
        .sort((a, b) => urutan[a.keadaan] - urutan[b.keadaan] || a.daerah.localeCompare(b.daerah))
    : null

  return {
    jumlah,
    ikutJenis,
    tajukKawasan: ikutDaerah ? 'Daerah' : 'Negeri',
    ikutKawasan: [...kawasanMap.entries()]
      .map(([nama, c]) => ({ nama, ...c }))
      .sort((a, b) => a.nama.localeCompare(b.nama)),
    tidakSedia,
  }
}

// --- Bantuan ---

type BarisSumbangan = {
  jenis_kumpulan: string | null
  jenis_sumbangan: string | null
  status: string | null
  negeri: string | null
}

async function ambilBantuan(t: TapisanPoket): Promise<PoketBantuan | null> {
  try {
    const [sumbangan, ngo] = await Promise.all([
      ambilSemua<BarisSumbangan>(() => {
        let q = supabase.from('sumbangan').select('id, jenis_kumpulan, jenis_sumbangan, status, negeri')
        if (t.negeri) q = q.in('negeri', ahliKumpulan(t.negeri))
        return q.order('id')
      }),
      ambilSemua<{ negeri: string | null }>(() => {
        let q = supabase.from('ngo').select('id, negeri')
        if (t.negeri) q = q.in('negeri', ahliKumpulan(t.negeri))
        return q.order('id')
      }),
    ])

    const ikutStatus = Object.fromEntries(STATUS_LIST.map((s) => [s, 0])) as Record<SumbanganStatus, number>
    const kumpulan = new Map<string, { jumlah: number; terima: number }>()
    const jenis = new Map<string, number>()
    const negeri = new Map<string, { jumlah: number; terima: number }>()

    for (const s of sumbangan) {
      const status = (STATUS_LIST as string[]).includes(s.status ?? '') ? (s.status as SumbanganStatus) : 'DALAM_PROSES'
      const terima = status === 'TERIMA' ? 1 : 0
      ikutStatus[status]++

      const k = kumpulan.get(s.jenis_kumpulan || 'LAIN-LAIN') ?? { jumlah: 0, terima: 0 }
      k.jumlah++
      k.terima += terima
      kumpulan.set(s.jenis_kumpulan || 'LAIN-LAIN', k)

      const j = s.jenis_sumbangan || 'LAIN-LAIN'
      jenis.set(j, (jenis.get(j) ?? 0) + 1)

      const n = kumpulanNegeri(s.negeri) || 'TIADA NEGERI'
      const nn = negeri.get(n) ?? { jumlah: 0, terima: 0 }
      nn.jumlah++
      nn.terima += terima
      negeri.set(n, nn)
    }

    return {
      jumlah: sumbangan.length,
      ikutStatus,
      ikutKumpulan: [...kumpulan.entries()].map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.jumlah - a.jumlah),
      ikutJenis: [...jenis.entries()].map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah),
      ikutNegeri: t.negeri
        ? null
        : [...negeri.entries()].map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.jumlah - a.jumlah),
      jumlahNgo: ngo.length,
    }
  } catch {
    return null
  }
}

export async function ambilPocketData(t: TapisanPoket): Promise<DataPoket> {
  const mahu = (p: PoketId) => t.poket.includes(p)
  const [bencana, logistik, bantuan] = await Promise.all([
    mahu('bencana') ? ambilBencana(t) : Promise.resolve(undefined),
    mahu('logistik') ? ambilLogistik(t) : Promise.resolve(undefined),
    mahu('bantuan') ? ambilBantuan(t) : Promise.resolve(undefined),
  ])
  return { tapisan: t, dijanaPada: new Date().toISOString(), bencana, logistik, bantuan }
}