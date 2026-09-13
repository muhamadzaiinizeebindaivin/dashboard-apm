import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { SumbanganForm } from '../components/SumbanganForm'
import apmLogo from '../assets/apm-logo.png'

export function Sumbangan() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">Sumbangan</h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Keluar
          </button>
        </div>

        <DashboardCard className="mt-6">
          <SumbanganForm />
        </DashboardCard>
      </div>
    </div>
  )
}
