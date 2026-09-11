import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NEGERI_LIST = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Pulau Pinang',
  'Perak',
  'Perlis',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan',
]

const JENIS_KUMPULAN = ['NGO', 'CDA', 'PERSATUAN', 'KELAB', 'PERSEKUTUAN']
const JENIS_SUMBANGAN = ['BAHAN MENTAH', 'PERKHIDMATAN'] as const

type ItemSumbangan = { id: number; keterangan: string }

type SumbanganFormProps = {
  onSuccess?: () => void
}

export function SumbanganForm({ onSuccess }: SumbanganFormProps) {
  const [jenisKumpulan, setJenisKumpulan] = useState('')
  const [namaKumpulan, setNamaKumpulan] = useState('')
  const [negeri, setNegeri] = useState('')
  const [jenisSumbangan, setJenisSumbangan] = useState<string>('')
  const [lokasiBantuan, setLokasiBantuan] = useState('')
  const [items, setItems] = useState<ItemSumbangan[]>([{ id: 1, keterangan: '' }])
  const [dihantar, setDihantar] = useState(false)
  const [menghantar, setMenghantar] = useState(false)
  const [ralat, setRalat] = useState('')

  function updateItem(id: number, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, keterangan: value } : it)))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, keterangan: '' },
    ])
  }

  function removeItem(id: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
  }

  async function handleHantar() {
    setRalat('')

    if (!jenisKumpulan || !namaKumpulan || !negeri || !jenisSumbangan || !lokasiBantuan) {
      setRalat('Sila lengkapkan semua medan sebelum menghantar.')
      return
    }

    setMenghantar(true)

    const sumbanganId = crypto.randomUUID()

    const { error: sumbanganError } = await supabase.from('sumbangan').insert({
      id: sumbanganId,
      jenis_kumpulan: jenisKumpulan,
      nama_kumpulan: namaKumpulan,
      negeri,
      jenis_sumbangan: jenisSumbangan,
      lokasi_bantuan: lokasiBantuan,
    })

    if (sumbanganError) {
      setRalat('Gagal menghantar. Sila cuba lagi.')
      setMenghantar(false)
      return
    }

    const itemRows = items
      .filter((it) => it.keterangan.trim() !== '')
      .map((it) => ({ sumbangan_id: sumbanganId, keterangan: it.keterangan }))

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase.from('sumbangan_items').insert(itemRows)
      if (itemsError) {
        setRalat('Sumbangan disimpan, tetapi butiran jumlah gagal disimpan.')
        setMenghantar(false)
        return
      }
    }

    setJenisKumpulan('')
    setNamaKumpulan('')
    setNegeri('')
    setJenisSumbangan('')
    setLokasiBantuan('')
    setItems([{ id: 1, keterangan: '' }])

    setMenghantar(false)
    setDihantar(true)
    setTimeout(() => setDihantar(false), 1500)
    onSuccess?.()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Jenis kumpulan
        </label>
        <select
          value={jenisKumpulan}
          onChange={(e) => setJenisKumpulan(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
        >
          <option value="">Pilih jenis kumpulan</option>
          {JENIS_KUMPULAN.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </div>

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
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Jenis sumbangan
        </label>
        <div className="flex gap-2">
          {JENIS_SUMBANGAN.map((jenis) => {
            const active = jenisSumbangan === jenis
            return (
              <button
                key={jenis}
                type="button"
                onClick={() => setJenisSumbangan(jenis)}
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
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Lokasi Bantuan
        </label>
        <select
          value={lokasiBantuan}
          onChange={(e) => setLokasiBantuan(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
        >
          <option value="">Pilih negeri</option>
          {NEGERI_LIST.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Jumlah sumbangan
        </label>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                value={item.keterangan}
                onChange={(e) => updateItem(item.id, e.target.value)}
                placeholder="Contoh: 15 buah / 15 orang"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 rounded-lg border border-neutral-200 p-2 text-neutral-400 hover:border-red-300 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-2 flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
        >
          <Plus size={14} />
          Tambah sumbangan lain
        </button>
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <motion.button
        type="button"
        onClick={handleHantar}
        disabled={menghantar}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {menghantar ? 'Menghantar...' : dihantar ? 'Berjaya dihantar ✓' : 'HANTAR'}
      </motion.button>
    </div>
  )
}
