import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ChevronRight } from 'lucide-react'
import { NEGERI_FLAG, NEGERI_LIST } from '../lib/negeriVisual'
import { supabase } from '../lib/supabase'

export function SenaraiSumbangan() {
  const navigate = useNavigate()
  const [kiraanNegeri, setKiraanNegeri] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('sumbangan').select('negeri')

    const kiraan: Record<string, number> = {}
    for (const row of (data as { negeri: string }[]) ?? []) {
      kiraan[row.negeri] = (kiraan[row.negeri] ?? 0) + 1
    }
    setKiraanNegeri(kiraan)
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
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-emerald-700"
            >
              <Home size={13} />
              Portal
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Sumbangan</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Senarai Sumbangan</h1>
          <p className="text-xs text-neutral-500">Pilih negeri untuk lihat senarai</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {NEGERI_LIST.map((negeri, i) => (
          <motion.button
            key={negeri}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/senarai-sumbangan/${encodeURIComponent(negeri)}`)}
            className="flex flex-col items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 text-sm font-medium text-neutral-800 shadow-lg backdrop-blur-md transition-colors hover:border-emerald-500"
          >
            <img src={NEGERI_FLAG[negeri]} alt={negeri} className="h-16 w-full rounded object-contain" />
            <span className="text-center leading-tight">{negeri}</span>
            {loading ? (
              <span className="h-5 w-8 animate-pulse rounded-full bg-neutral-100" />
            ) : (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                {kiraanNegeri[negeri] ?? 0}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
