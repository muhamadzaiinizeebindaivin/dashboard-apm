import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import { useAuth } from '../hooks/useAuth'
import { NAV_TABS } from '../lib/navTabs'
import { ROLE_LABEL } from '../lib/roles'
import { ConfirmModal } from './ConfirmModal'

type SidebarContentProps = {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { profile, signOut } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const TABS = NAV_TABS.filter((tab) => profile && tab.allow.includes(profile.role))

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
        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }} className="flex flex-col gap-2 px-4 py-2">
              {[70, 50, 65, 55, 60, 45, 50].map((w, i) => (
                <span
                  key={i}
                  style={{ width: `${w}%` }}
                  className="h-3 animate-pulse rounded-full bg-neutral-300/50"
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="border-t border-white/60 px-5 py-4">
        {profile && (
          <span className="mb-3 inline-block rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </span>
        )}
        <button
          onClick={() => setConfirmSignOut(true)}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} />
          Log Keluar
        </button>
      </div>

      <ConfirmModal
        open={confirmSignOut}
        title="Log Keluar"
        message="Adakah anda pasti mahu log keluar?"
        confirmLabel="Log Keluar"
        danger
        onConfirm={() => {
          setConfirmSignOut(false)
          signOut()
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  )
}
