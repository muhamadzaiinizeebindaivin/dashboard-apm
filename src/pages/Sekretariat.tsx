import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, FileClock } from 'lucide-react'

const PILIHAN = [
  {
    to: 'laporan-awal',
    label: 'Laporan Awal',
    desc: 'Laporan pertama sebaik sahaja kejadian dikenal pasti.',
    icon: FileText,
  },
  {
    to: 'laporan-semasa',
    label: 'Laporan Semasa',
    desc: 'Kemas kini berterusan sepanjang tempoh operasi.',
    icon: FileClock,
  },
]

export function Sekretariat() {
  const location = useLocation()
  const onLanding = location.pathname === '/sekretariat'

  return (
    <div>
      <div className="py-2">
        <p className="text-sm text-neutral-400">Portal &gt; Sekretariat</p>
        <h1 className="text-2xl font-semibold text-neutral-900">Sekretariat</h1>
      </div>

      {onLanding && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PILIHAN.map(({ to, label, desc, icon: Icon }) => (
            <Link key={to} to={to}>
              <motion.div
                whileHover={{ y: -2 }}
                className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="font-medium text-neutral-900">{label}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{desc}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <Outlet />
    </div>
  )
}
