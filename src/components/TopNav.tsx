import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Search, Mail, Bell, LogOut, Menu, X } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import { useAuth } from '../hooks/useAuth'
import { NAV_TABS } from '../lib/navTabs'
import { ROLE_LABEL } from '../lib/roles'
import { AnimatePresence as NavAnimatePresence } from 'framer-motion'
import { ConfirmModal } from './ConfirmModal'

export function TopNav() {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const TABS = NAV_TABS.filter((tab) => profile && tab.allow.includes(profile.role))

  return (
    <header className="px-4 py-4 sm:px-8 sm:py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src={apmLogo} alt="Logo APM" className="h-11 w-11 shrink-0 object-contain sm:h-16 sm:w-16" />

          {/* Desktop nav — hidden below lg, since 7 tabs need real room */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/40 p-1 shadow-md backdrop-blur-md lg:flex">
            <AnimatePresence mode="wait">
              {!profile ? (
                <motion.div
                  key="skeleton"
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1.5"
                >
                  {[16, 12, 20, 16, 14].map((w, i) => (
                    <span
                      key={i}
                      style={{ width: w * 4 }}
                      className="h-3 animate-pulse rounded-full bg-neutral-300/60"
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="tabs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  {TABS.map((tab) => (
                    <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="relative">
                      {({ isActive }) => (
                        <span
                          className={`relative z-10 block rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            isActive ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'
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
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </div>

        {/* Desktop right side — hidden below lg */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-3 py-2 shadow-md backdrop-blur-md">
            <Search size={16} className="text-neutral-500" />
            <input
              placeholder="Cari..."
              className="w-32 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-500"
            />
          </div>
          <button className="rounded-full border border-white/60 bg-white/40 p-2 text-neutral-600 shadow-md backdrop-blur-md hover:text-neutral-900">
            <Mail size={16} />
          </button>
          <button className="rounded-full border border-white/60 bg-white/40 p-2 text-neutral-600 shadow-md backdrop-blur-md hover:text-neutral-900">
            <Bell size={16} />
          </button>

          {profile && (
            <span className="rounded-full border border-white/60 bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white shadow-md backdrop-blur-md">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          )}

          <button
            onClick={() => setConfirmSignOut(true)}
            title="Log keluar"
            className="rounded-full border border-white/60 bg-white/40 p-2 text-neutral-600 shadow-md backdrop-blur-md hover:text-red-600"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Mobile/tablet: compact role badge + hamburger toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {profile && (
            <span className="hidden rounded-full border border-white/60 bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white shadow-md backdrop-blur-md sm:inline-block">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full border border-white/60 bg-white/40 p-2 text-neutral-700 shadow-md backdrop-blur-md"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile/tablet dropdown panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-white/60 bg-white/60 p-2 shadow-lg backdrop-blur-md">
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-emerald-700 text-white' : 'text-neutral-700 hover:bg-white/60'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}

              <div className="mt-2 flex items-center justify-between border-t border-white/60 px-4 pt-3">
                {profile && (
                  <span className="rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white">
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </span>
                )}
                <button
                  onClick={() => setConfirmSignOut(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600"
                >
                  <LogOut size={16} />
                  Log Keluar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </header>
  )
}
