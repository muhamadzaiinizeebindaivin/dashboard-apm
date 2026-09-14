import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Home, ChevronRight, ChevronDown, ChevronLeft, Search } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { TambahSumbanganModal } from '../components/TambahSumbanganModal'
import { NEGERI_FLAG } from '../lib/negeriVisual'
import { supabase } from '../lib/supabase'

type SumbanganRow = {
  id: string
  jenis_kumpulan: string
  nama_kumpulan: string
  no_tel: string | null
  negeri: string
  jenis_sumbangan: string
  lokasi_bantuan: string
  created_at: string
}

const JENIS_KUMPULAN_LIST = ['NGO', 'CDA', 'PERSATUAN', 'KELAB', 'PERSEKUTUAN']
const JENIS_SUMBANGAN_LIST = ['BAHAN MENTAH', 'PERKHIDMATAN']
const SAIZ_HALAMAN = 10

export function SenaraiSumbangan() {
  const [rows, setRows] = useState<SumbanganRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [negeriDibuka, setNegeriDibuka] = useState<Set<string>>(new Set())
  const [halamanPerNegeri, setHalamanPerNegeri] = useState<Record<string, number>>({})

  const [carian, setCarian] = useState('')
  const [tapisJenisKumpulan, setTapisJenisKumpulan] = useState('')
  const [tapisJenisSumbangan, setTapisJenisSumbangan] = useState('')

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sumbangan')
      .select('id, jenis_kumpulan, nama_kumpulan, no_tel, negeri, jenis_sumbangan, lokasi_bantuan, created_at')
      .order('created_at', { ascending: false })

    setRows((data as SumbanganRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  useEffect(() => {
    setHalamanPerNegeri({})
  }, [carian, tapisJenisKumpulan, tapisJenisSumbangan])

  function toggleNegeri(negeri: string) {
    setNegeriDibuka((prev) => {
      const next = new Set(prev)
      if (next.has(negeri)) {
        next.delete(negeri)
      } else {
        next.add(negeri)
      }
      return next
    })
  }

  const rowsTertapis = rows.filter((row) => {
    const carianRendah = carian.trim().toLowerCase()
    const cocokCarian =
      carianRendah === '' ||
      row.nama_kumpulan.toLowerCase().includes(carianRendah) ||
      (row.no_tel ?? '').toLowerCase().includes(carianRendah)
    const cocokJenisKumpulan = tapisJenisKumpulan === '' || row.jenis_kumpulan === tapisJenisKumpulan
    const cocokJenisSumbangan = tapisJenisSumbangan === '' || row.jenis_sumbangan === tapisJenisSumbangan
    return cocokCarian && cocokJenisKumpulan && cocokJenisSumbangan
  })

  const kumpulanNegeri = rowsTertapis.reduce((map, row) => {
    const list = map.get(row.negeri) ?? []
    list.push(row)
    map.set(row.negeri, list)
    return map
  }, new Map<string, SumbanganRow[]>())

  const negeriTersusun = Array.from(kumpulanNegeri.keys()).sort((a, b) => a.localeCompare(b))

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <Home size={13} className="text-neutral-400" />
            <span className="text-neutral-400">Portal</span>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Sumbangan</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Senarai Sumbangan</h1>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Tambah
        </motion.button>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            placeholder="Cari nama kumpulan atau no. tel..."
            className="w-full rounded-full border border-white/60 bg-white/60 py-2.5 pl-9 pr-4 text-sm text-neutral-900 outline-none backdrop-blur-md focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Jenis Kumpulan:</span>
          <button
            onClick={() => setTapisJenisKumpulan('')}
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
              tapisJenisKumpulan === ''
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
            }`}
          >
            Semua
          </button>
          {JENIS_KUMPULAN_LIST.map((j) => (
            <button
              key={j}
              onClick={() => setTapisJenisKumpulan(tapisJenisKumpulan === j ? '' : j)}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisJenisKumpulan === j
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              {j}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Jenis Sumbangan:</span>
          <button
            onClick={() => setTapisJenisSumbangan('')}
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
              tapisJenisSumbangan === ''
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
            }`}
          >
            Semua
          </button>
          {JENIS_SUMBANGAN_LIST.map((j) => (
            <button
              key={j}
              onClick={() => setTapisJenisSumbangan(tapisJenisSumbangan === j ? '' : j)}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisJenisSumbangan === j
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <DashboardCard>
            <p className="text-sm text-neutral-400">Memuatkan...</p>
          </DashboardCard>
        ) : rows.length === 0 ? (
          <DashboardCard>
            <p className="text-sm text-neutral-400">Tiada sumbangan direkodkan lagi.</p>
          </DashboardCard>
        ) : negeriTersusun.length === 0 ? (
          <DashboardCard>
            <p className="text-sm text-neutral-400">Tiada sumbangan sepadan dengan carian/tapisan.</p>
          </DashboardCard>
        ) : (
          negeriTersusun.map((negeri) => {
            const kumpulan = kumpulanNegeri.get(negeri)!
            const terbuka = negeriDibuka.has(negeri)
            const halaman = halamanPerNegeri[negeri] ?? 1
            const jumlahHalaman = Math.max(1, Math.ceil(kumpulan.length / SAIZ_HALAMAN))
            const kumpulanHalamanIni = kumpulan.slice((halaman - 1) * SAIZ_HALAMAN, halaman * SAIZ_HALAMAN)

            return (
              <DashboardCard key={negeri} className="overflow-hidden !p-0">
                <button
                  onClick={() => toggleNegeri(negeri)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/40"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={NEGERI_FLAG[negeri]}
                      alt={negeri}
                      className="h-8 w-11 rounded object-cover"
                    />
                    <span className="font-medium text-neutral-900">{negeri}</span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                      {kumpulan.length}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: terbuka ? 180 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronDown size={18} className="text-neutral-400" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {terbuka && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="overflow-x-auto border-t border-neutral-100 px-6 pb-4 pt-3">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 text-neutral-400">
                              <th className="pb-2 pr-4 font-medium">Jenis Kumpulan</th>
                              <th className="pb-2 pr-4 font-medium">Nama Kumpulan</th>
                              <th className="pb-2 pr-4 font-medium">No. Tel</th>
                              <th className="pb-2 pr-4 font-medium">Jenis Sumbangan</th>
                              <th className="pb-2 pr-4 font-medium">Lokasi Bantuan</th>
                              <th className="pb-2 font-medium">Tarikh</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kumpulanHalamanIni.map((row) => (
                              <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                                <td className="py-2 pr-4 text-neutral-800">{row.jenis_kumpulan}</td>
                                <td className="py-2 pr-4 text-neutral-800">{row.nama_kumpulan}</td>
                                <td className="py-2 pr-4 text-neutral-600">{row.no_tel ?? '—'}</td>
                                <td className="py-2 pr-4 text-neutral-600">{row.jenis_sumbangan}</td>
                                <td className="py-2 pr-4 text-neutral-600">{row.lokasi_bantuan}</td>
                                <td className="py-2 text-neutral-400">
                                  {new Date(row.created_at).toLocaleDateString('ms-MY')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {jumlahHalaman > 1 && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                setHalamanPerNegeri((prev) => ({
                                  ...prev,
                                  [negeri]: Math.max(1, halaman - 1),
                                }))
                              }
                              disabled={halaman === 1}
                              className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
                            >
                              <ChevronLeft size={12} />
                              Sebelum
                            </button>
                            <span className="text-xs font-medium text-neutral-500">
                              {halaman} / {jumlahHalaman}
                            </span>
                            <button
                              onClick={() =>
                                setHalamanPerNegeri((prev) => ({
                                  ...prev,
                                  [negeri]: Math.min(jumlahHalaman, halaman + 1),
                                }))
                              }
                              disabled={halaman === jumlahHalaman}
                              className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
                            >
                              Seterusnya
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DashboardCard>
            )
          })
        )}
      </div>

      <TambahSumbanganModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          muatSemula()
        }}
      />
    </div>
  )
}
