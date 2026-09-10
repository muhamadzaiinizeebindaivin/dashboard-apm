import { StatCard } from '../components/StatCard'
import { DashboardCard } from '../components/DashboardCard'

export function HomeScreen() {
  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-neutral-400">Portal &gt; Laman Utama</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Selamat pagi</h1>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Kes aktif" value="128" detail="Klik untuk lihat pecahan mengikut kategori." />
        <StatCard label="Tugasan terbuka" value="42" detail="Tugasan yang belum diselesaikan minggu ini." />
        <StatCard label="Masa tindak balas" value="99.9%" detail="Purata 30 hari lepas, dikemaskini setiap hari." />
      </div>

      <DashboardCard className="mt-4">
        <h2 className="text-base font-medium text-neutral-900">Aktiviti terkini</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Ringkasan aktiviti akan dipaparkan di sini setelah data sebenar disambungkan.
        </p>
      </DashboardCard>
    </div>
  )
}
