import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Home, ChevronRight } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { TambahSumbanganModal } from '../components/TambahSumbanganModal'
import { supabase } from '../lib/supabase'

type SumbanganRow = {
  id: string
  jenis_kumpulan: string
  nama_kumpulan: string
  negeri: string
  jenis_sumbangan: string
  lokasi_bantuan: string
  created_at: string
}

export function SenaraiSumbangan() {
  const [rows, setRows] = useState<SumbanganRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sumbangan')
      .select('id, jenis_kumpulan, nama_kumpulan, negeri, jenis_sumbangan, lokasi_bantuan, created_at')
      .order('created_at', { ascending: false })

    setRows((data as SumbanganRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

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

      <DashboardCard className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-neutral-400">Memuatkan...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-400">Tiada sumbangan direkodkan lagi.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Jenis Kumpulan</th>
                <th className="pb-2 pr-4 font-medium">Nama Kumpulan</th>
                <th className="pb-2 pr-4 font-medium">Negeri</th>
                <th className="pb-2 pr-4 font-medium">Jenis Sumbangan</th>
                <th className="pb-2 pr-4 font-medium">Lokasi Bantuan</th>
                <th className="pb-2 font-medium">Tarikh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 pr-4 text-neutral-800">{row.jenis_kumpulan}</td>
                  <td className="py-2 pr-4 text-neutral-800">{row.nama_kumpulan}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.negeri}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.jenis_sumbangan}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.lokasi_bantuan}</td>
                  <td className="py-2 text-neutral-400">
                    {new Date(row.created_at).toLocaleDateString('ms-MY')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>

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
