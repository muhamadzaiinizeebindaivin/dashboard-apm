import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { NEGERI_LIST } from '../lib/negeriVisual'

const JENIS_BANTUAN = ['Makanan', 'Pakaian', 'Kesihatan'] as const

export type ExistingNgo = {
  id: string
  nama_kumpulan: string
  lokasi_bencana: string
  jenis_bantuan: string[]
}

type NgoFormProps = {
  onSuccess?: () => void
  negeriTetap?: string
  existing?: ExistingNgo
}

export function NgoForm({ onSuccess, negeriTetap, existing }: NgoFormProps) {
  const jenisAwal = existing?.jenis_bantuan ?? []
  const [namaKumpulan, setNamaKumpulan] = useState(existing?.nama_kumpulan ?? '')
  const [negeri, setNegeri] = useState(negeriTetap ?? '')
  const [lokasiBencana, setLokasiBencana] = useState(existing?.lokasi_bencana ?? '')
  const [bantuanDipilih, setBantuanDipilih] = useState<string[]>(
    jenisAwal.filter((j) => (JENIS_BANTUAN as readonly string[]).includes(j)),
  )
  const [lainLain, setLainLain] = useState(
    jenisAwal.find((j) => !(JENIS_BANTUAN as readonly string[]).includes(j)) ?? '',
  )
  const [menghantar, setMenghantar] = useState(false)
  const [dihantar, setDihantar] = useState(false)
  const [ralat, setRalat] = useState('')

  function toggleBantuan(jenis: string) {
    setBantuanDipilih((prev) =>
      prev.includes(jenis) ? prev.filter((b) => b !== jenis) : [...prev, jenis],
    )
  }

  async function handleHantar(e: FormEvent) {
    e.preventDefault()
    setRalat('')

    const jenisBantuan = [...bantuanDipilih, ...(lainLain.trim() ? [lainLain.trim()] : [])]

    if (!namaKumpulan || !negeri || !lokasiBencana || jenisBantuan.length === 0) {
      setRalat('Sila lengkapkan semua medan dan pilih sekurang-kurangnya satu jenis bantuan.')
      return
    }

    setMenghantar(true)

    const payload = {
      nama_kumpulan: namaKumpulan,
      negeri,
      lokasi_bencana: lokasiBencana,
      jenis_bantuan: jenisBantuan,
    }

    const { error } = existing
      ? await supabase.from('ngo').update(payload).eq('id', existing.id)
      : await supabase.from('ngo').insert(payload)

    setMenghantar(false)

    if (error) {
      setRalat('Gagal menghantar. Sila cuba lagi.')
      return
    }

    if (!existing) {
      setNamaKumpulan('')
      setNegeri(negeriTetap ?? '')
      setLokasiBencana('')
      setBantuanDipilih([])
      setLainLain('')
    }

    setDihantar(true)
    setTimeout(() => setDihantar(false), 1500)
    onSuccess?.()
  }

  return (
    <form onSubmit={handleHantar} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nama kumpulan
        </label>
        <input
          value={namaKumpulan}
          onChange={(e) => setNamaKumpulan(e.target.value)}
          placeholder="Contoh: Persatuan Bulan Sabit Merah"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Negeri</label>
        {negeriTetap ? (
          <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {negeriTetap}
          </div>
        ) : (
          <select
            value={negeri}
            onChange={(e) => setNegeri(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
          >
            <option value="">Pilih negeri</option>
            {NEGERI_LIST.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Lokasi bencana
        </label>
        <input
          value={lokasiBencana}
          onChange={(e) => setLokasiBencana(e.target.value)}
          placeholder="Contoh: Taman Sri Aman, Kuantan"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Jenis Bantuan
        </label>
        <div className="flex flex-wrap gap-2">
          {JENIS_BANTUAN.map((jenis) => {
            const active = bantuanDipilih.includes(jenis)
            return (
              <button
                key={jenis}
                type="button"
                onClick={() => toggleBantuan(jenis)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {jenis}
              </button>
            )
          })}
        </div>
        <input
          value={lainLain}
          onChange={(e) => setLainLain(e.target.value)}
          placeholder="Lain-lain (nyatakan)"
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
        />
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <motion.button
        type="submit"
        disabled={menghantar}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {menghantar
          ? 'Menyimpan...'
          : dihantar
            ? existing
              ? 'Berjaya dikemas kini ✓'
              : 'Berjaya dihantar ✓'
            : existing
              ? 'KEMAS KINI'
              : 'HANTAR'}
      </motion.button>
    </form>
  )
}