import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { SumbanganForm } from '../components/SumbanganForm'
import apmLogo from '../assets/apm-logo.png'

export function Sumbangan() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">Sumbangan</h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300"
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
