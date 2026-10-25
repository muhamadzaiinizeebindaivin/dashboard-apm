import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import { NEGERI_FLAG } from '../lib/negeriVisual'
import { SENARAI_KUMPULAN_NEGERI } from '../lib/kumpulanNegeri'

// KL, Putrajaya and Labuan: one "Wilayah Persekutuan" team page
const NEGERI_LOGO = SENARAI_KUMPULAN_NEGERI.map((nama) => ({ nama, logo: NEGERI_FLAG[nama] }))

export function Paras() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
      {/* Soft glow blobs behind the glass layer */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-11 w-11 object-contain" />
            <div>
              <h1 className="text-base font-semibold text-neutral-900 sm:text-xl">Pasukan Respon Sokongan Bencana</h1>
              <p className="text-xs text-neutral-600">Pilih negeri untuk mula menjejak</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Keluar
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {NEGERI_LOGO.map(({ nama, logo }, i) => (
            <motion.button
              key={nama}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: i * 0.03, type: 'tween', duration: 0.2, ease: 'easeOut' }}
              onClick={() => navigate(`/paras/jejak/${encodeURIComponent(nama)}`)}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 text-sm font-medium text-neutral-900 shadow-lg backdrop-blur-md transition-colors duration-150 ease-out hover:border-emerald-500 hover:bg-white/60"
            >
              <img src={logo} alt={nama} className="h-16 w-full object-contain" />
              <span className="text-center leading-tight">{nama}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
