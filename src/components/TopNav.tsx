import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Search, Mail, Bell } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'

const TABS = [
  { to: '/ngo', label: 'NGO' },
  { to: '/bencana', label: 'Bencana' },
  { to: '/sekretariat', label: 'Sekretariat' },
  { to: '/logistik', label: 'Logistik' },
]

export function TopNav() {
  return (
    <header className="flex items-center justify-between px-8 py-5">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <img src={apmLogo} alt="Logo APM" className="h-16 w-16 shrink-0 object-contain" />
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="relative">
              {({ isActive }) => (
                <span
                  className={`relative z-10 block rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-emerald-700"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  {tab.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2">
          <Search size={16} className="text-neutral-400" />
          <input
            placeholder="Cari..."
            className="w-32 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </div>
        <button className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 hover:text-neutral-700">
          <Mail size={16} />
        </button>
        <button className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 hover:text-neutral-700">
          <Bell size={16} />
        </button>
        <div className="h-9 w-9 rounded-full bg-neutral-300" />
      </div>
    </header>
  )
}
