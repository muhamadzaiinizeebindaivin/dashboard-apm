import { Home, ChevronRight } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'

export function Logistik() {
  return (
    <div>
      <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-sm">
          <Home size={13} className="text-neutral-400" />
          <span className="text-neutral-400">Portal</span>
          <ChevronRight size={13} className="text-neutral-300" />
          <span className="font-medium text-emerald-700">Logistik</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Logistik</h1>
      </div>

      <DashboardCard className="mt-6">
        <h2 className="text-base font-medium text-neutral-900">Rekod logistik</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Data logistik akan dipaparkan di sini sebaik sahaja jadual pangkalan data
          disediakan.
        </p>
      </DashboardCard>
    </div>
  )
}
