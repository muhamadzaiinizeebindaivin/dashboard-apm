import { useState, useEffect } from 'react'
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
  'Kuala Lumpur',
  'Putrajaya',
  'Labuan',
]

const JENIS_KUMPULAN = ['NGO', 'CDA', 'PERSATUAN', 'KELAB', 'PERSEKUTUAN']
const JENIS_SUMBANGAN = ['BAHAN MENTAH', 'PERKHIDMATAN'] as const

type ItemSumbangan = { id: number; nama: string; kuantiti: string; unit: string }

export type ExistingSumbangan = {
  id: string
  jenis_kumpulan: string
  nama_kumpulan: string
  no_tel: string | null
  jenis_sumbangan: string
  lokasi_bantuan: string
}

type SumbanganFormProps = {
  onSuccess?: () => void
  negeriTetap?: string
  existing?: ExistingSumbangan
}

export function SumbanganForm({ onSuccess, negeriTetap, existing }: SumbanganFormProps) {
  const [jenisKumpulan, setJenisKumpulan] = useState(existing?.jenis_kumpulan ?? '')
  const [namaKumpulan, setNamaKumpulan] = useState(existing?.nama_kumpulan ?? '')
  const [noTel, setNoTel] = useState(existing?.no_tel ?? '')
  const [negeri, setNegeri] = useState(negeriTetap ?? '')
  const [jenisSumbangan, setJenisSumbangan] = useState<string>(existing?.jenis_sumbangan ?? '')
  const [lokasiBantuan, setLokasiBantuan] = useState(existing?.lokasi_bantuan ?? '')
  const [items, setItems] = useState<ItemSumbangan[]>([{ id: 1, nama: '', kuantiti: '', unit: '' }])
  const [dihantar, setDihantar] = useState(false)
  const [menghantar, setMenghantar] = useState(false)
  const [ralat, setRalat] = useState('')

  useEffect(() => {
    if (!existing) return
    supabase
      .from('sumbangan_items')
      .select('id, nama_item, kuantiti, unit')
      .eq('sumbangan_id', existing.id)
      .then(({ data }) => {
        const rows = (data as { id: string; nama_item: string; kuantiti: string | null; unit: string | null }[]) ?? []
        if (rows.length > 0) {
          setItems(
            rows.map((r, i) => ({
              id: i + 1,
              nama: r.nama_item,
              kuantiti: r.kuantiti ?? '',
              unit: r.unit ?? '',
            })),
          )
        }
      })
  }, [existing])

  function updateItem(id: number, field: 'nama' | 'kuantiti' | 'unit', value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, nama: '', kuantiti: '', unit: '' },
    ])
  }

  function removeItem(id: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
  }

  async function handleHantar() {
    setRalat('')

    if (!jenisKumpulan || !namaKumpulan || !noTel || !negeri || !jenisSumbangan || !lokasiBantuan) {
      setRalat('Sila lengkapkan semua medan sebelum menghantar.')
      return
    }

    setMenghantar(true)

    const sumbanganId = existing?.id ?? crypto.randomUUID()

    const payload = {
      jenis_kumpulan: jenisKumpulan,
      nama_kumpulan: namaKumpulan,
      no_tel: noTel,
      negeri,
      jenis_sumbangan: jenisSumbangan,
      lokasi_bantuan: lokasiBantuan,
    }

    const { error: sumbanganError } = existing
      ? await supabase.from('sumbangan').update(payload).eq('id', existing.id)
      : await supabase.from('sumbangan').insert({ id: sumbanganId, ...payload })

    if (sumbanganError) {
      setRalat('Gagal menghantar. Sila cuba lagi.')
      setMenghantar(false)
      return
    }

    // Replacing all items on each save is simpler than diffing individual
    // rows, and this list is always short (a handful of line items).
    if (existing) {
      await supabase.from('sumbangan_items').delete().eq('sumbangan_id', sumbanganId)
    }

    const itemRows = items
      .filter((it) => it.nama.trim() !== '')
      .map((it) => ({
        sumbangan_id: sumbanganId,
        nama_item: it.nama,
        kuantiti: it.kuantiti,
        unit: it.unit,
      }))

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase.from('sumbangan_items').insert(itemRows)
      if (itemsError) {
        setRalat('Sumbangan disimpan, tetapi butiran jumlah gagal disimpan.')
        setMenghantar(false)
        return
      }
    }

    if (!existing) {
      setJenisKumpulan('')
      setNamaKumpulan('')
      setNoTel('')
      setNegeri(negeriTetap ?? '')
      setJenisSumbangan('')
      setLokasiBantuan('')
      setItems([{ id: 1, nama: '', kuantiti: '', unit: '' }])
    }

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
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          No. Tel dihubungi
        </label>
        <input
          type="tel"
          value={noTel}
          onChange={(e) => setNoTel(e.target.value)}
          placeholder="Contoh: 012-3456789"
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
                value={item.nama}
                onChange={(e) => updateItem(item.id, 'nama', e.target.value)}
                placeholder="Contoh: Tilam"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
              />
              <input
                value={item.kuantiti}
                onChange={(e) => updateItem(item.id, 'kuantiti', e.target.value)}
                placeholder="15"
                inputMode="numeric"
                className="w-20 shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
              />
              <input
                value={item.unit}
                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                placeholder="orang"
                className="w-24 shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600"
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
    </div>
  )
}
