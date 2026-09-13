import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, ChevronRight } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'

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
  'Labuan',
  'Putrajaya',
]

const JENIS_BANTUAN = ['Makanan', 'Pakaian', 'Kesihatan'] as const

export function Ngo() {
  const [namaKumpulan, setNamaKumpulan] = useState('')
  const [negeri, setNegeri] = useState('')
  const [lokasiBencana, setLokasiBencana] = useState('')
  const [bantuanDipilih, setBantuanDipilih] = useState<string[]>([])
  const [lainLain, setLainLain] = useState('')
  const [dihantar, setDihantar] = useState(false)

  function toggleBantuan(jenis: string) {
    setBantuanDipilih((prev) =>
      prev.includes(jenis) ? prev.filter((b) => b !== jenis) : [...prev, jenis],
    )
  }

  function handleHantar() {
    // TODO: sambungkan ke jadual Supabase sebaik sahaja tab NGO diaktifkan
    setDihantar(true)
    setTimeout(() => setDihantar(false), 2000)
  }

  return (
    <div>
      <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-sm">
          <Home size={13} className="text-neutral-400" />
          <span className="text-neutral-400">Portal</span>
          <ChevronRight size={13} className="text-neutral-300" />
          <span className="font-medium text-emerald-700">NGO</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">NGO</h1>
      </div>

      <DashboardCard className="mt-6 max-w-xl">
        <div className="space-y-4">
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
              Negeri
            </label>
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

          <motion.button
            type="button"
            onClick={handleHantar}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {dihantar ? 'Berjaya dihantar ✓' : 'HANTAR'}
          </motion.button>
        </div>
      </DashboardCard>
    </div>
  )
}
