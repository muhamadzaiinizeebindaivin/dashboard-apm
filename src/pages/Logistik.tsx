import { DashboardCard } from '../components/DashboardCard'

export function Logistik() {
  return (
    <div>
      <div className="py-2">
        <p className="text-sm text-neutral-400">Portal &gt; Logistik</p>
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
