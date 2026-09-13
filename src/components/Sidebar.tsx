import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import { useAuth } from '../hooks/useAuth'

const TABS = [
  { to: '/', label: 'Laman Utama' },
  { to: '/ngo', label: 'NGO' },
  { to: '/bencana', label: 'Bencana' },
  { to: '/sekretariat', label: 'Sekretariat' },
  { to: '/logistik', label: 'Logistik' },
  { to: '/senarai-sumbangan', label: 'Sumbangan' },
  { to: '/senarai-paras', label: 'PARAS' },
]

const ROLE_LABEL: Record<string, string> = {
  pkop: 'Super Admin (PKOP)',
  pkon: 'Admin (PKON)',
  pkod: 'Operator (PKOD)',
}

type SidebarContentProps = {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <img src={apmLogo} alt="Logo APM" className="h-12 w-12 shrink-0 object-contain" />
        <span className="text-sm font-semibold leading-tight text-neutral-900">
          APM
          <br />
          Bahagian Pengurusan Bencana Operasi
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            onClick={onNavigate}
            className="relative"
          >
            {({ isActive }) => (
              <span
                className={`relative z-10 block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-tab-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-emerald-700"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {tab.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/60 px-5 py-4">
        {profile && (
          <span className="mb-3 inline-block rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </span>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} />
          Log Keluar
        </button>
      </div>
    </div>
  )
}
