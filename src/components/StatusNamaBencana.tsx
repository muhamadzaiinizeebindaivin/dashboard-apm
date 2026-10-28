import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { kunci } from '../lib/normalisasi'
import { namaTerdekat } from '../lib/padananNama'

// Laporan Semasa: tells the operator whether the disaster name matches a known one
// (with or without its Laporan Awal, ended or not) and suggests close names, so a
// slightly different spelling doesn't create a duplicate disaster. Never blocks sending:
// the page asks for a confirmation instead (see `onStatus`).

type BencanaDikenali = {
  nama: string
  negeri: string[]
  awal_pada: string | null
  tamat_pada: string | null
}

const tarikh = (iso: string) =>
  new Date(iso).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })

type Props = {
  kodAkses: string | null
  nama: string
  negeri?: string
  onPilih: (nama: string) => void
  // Reports whether the name has a Laporan Awal: true / false, or null when unknown
  // (list unavailable or no name yet) so the page never warns on missing data
  onStatus?: (adaLaporanAwal: boolean | null) => void
}

export function StatusNamaBencana({ kodAkses, nama, negeri, onPilih, onStatus }: Props) {
  const [senarai, setSenarai] = useState<BencanaDikenali[] | null>(null)

  useEffect(() => {
    let batal = false
    supabase.rpc('semak_senarai_bencana', { p_code: kodAkses }).then(({ data, error }) => {
      if (!batal) setSenarai(error ? null : ((data as BencanaDikenali[]) ?? []).map((b) => ({ ...b, negeri: b.negeri ?? [] })))
    })
    return () => {
      batal = true
    }
  }, [kodAkses])

  const namaBersih = nama.trim()
  const padanan = senarai && namaBersih ? senarai.find((b) => kunci(b.nama) === kunci(namaBersih)) : undefined
  const status = !senarai || !namaBersih ? null : !!padanan?.awal_pada

  useEffect(() => {
    onStatus?.(status)
  }, [status, onStatus])

  if (!senarai || !namaBersih) return null // list unavailable: say nothing rather than something wrong

  // Ongoing disasters of the selected state that have a Laporan Awal: the names to pick from
  const awalNegeri = negeri
    ? senarai.filter((b) => b.awal_pada && !b.tamat_pada && b.negeri.includes(negeri) && kunci(b.nama) !== kunci(namaBersih))
    : []
  const butangNama = (b: BencanaDikenali) => (
    <button
      key={b.nama}
      type="button"
      onClick={() => onPilih(b.nama)}
      className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 font-medium text-amber-900 transition-colors hover:bg-amber-100"
    >
      {b.nama}
    </button>
  )
  const senaraiAwalNegeri = awalNegeri.length > 0 && (
    <span className="flex flex-wrap items-center gap-1.5 pl-5">
      Laporan Awal di {negeri}:{awalNegeri.slice(0, 8).map(butangNama)}
    </span>
  )
  const kelasAmaran =
    'flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2'

  if (padanan?.tamat_pada) {
    return (
      <p className={kelasAmaran}>
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          Bencana ini telah ditamatkan pada {tarikh(padanan.tamat_pada)}. Jika laporan ini masih mempunyai mangsa
          di PPS, bencana akan <strong>diaktifkan semula</strong> secara automatik.
        </span>
      </p>
    )
  }

  if (padanan?.awal_pada) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700 sm:col-span-2">
        <CheckCircle2 size={14} className="shrink-0" />
        Laporan Awal dijumpai (dihantar {tarikh(padanan.awal_pada)}).
      </p>
    )
  }

  if (padanan) {
    return (
      <div className={`${kelasAmaran} flex-col`}>
        <span className="flex items-start gap-1.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Bencana ini belum mempunyai Laporan Awal. Nama Laporan Semasa perlu sama dengan Laporan Awal.
        </span>
        {senaraiAwalNegeri}
      </div>
    )
  }

  const cadangan = namaTerdekat(namaBersih, senarai, negeri)
  return (
    <div className={`${kelasAmaran} flex-col`}>
      <span className="flex items-start gap-1.5">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        Tiada Laporan Awal bagi bencana ini. Pastikan nama sama seperti dalam Laporan Awal.
      </span>
      {cadangan.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5 pl-5">
          Mungkin maksud anda:
          {cadangan.map(butangNama)}
        </span>
      ) : (
        // Nothing close: still offer the state's Laporan Awal names, however different the spelling
        senaraiAwalNegeri
      )}
    </div>
  )
}