import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronsLeft } from 'lucide-react'
import { SidebarContent } from './Sidebar'
import apmLogo from '../assets/apm-logo.png'

type AppShellProps = {
  children: ReactNode
}

// Desktop sidebar collapsed or not, remembered on this computer
const KUNCI_SIDEBAR = 'sidebar-kecil'

function bacaKecil() {
  try {
    return localStorage.getItem(KUNCI_SIDEBAR) === '1'
  } catch {
    return false
  }
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [kecil, setKecil] = useState(bacaKecil)

  function togolSidebar() {
    setKecil((k) => {
      try {
        localStorage.setItem(KUNCI_SIDEBAR, k ? '0' : '1')
      } catch {
        // storage unavailable (private mode): the choice simply isn't remembered
      }
      return !k
    })
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative flex">
        {/* Persistent sidebar — desktop only */}
        <aside
          className={`hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:border-r lg:border-white/60 lg:bg-white/40 lg:shadow-lg lg:backdrop-blur-md ${
            kecil ? 'lg:w-20' : 'lg:w-72'
          }`}
        >
          <SidebarContent kecil={kecil} />
          {/* Collapse / expand, on the sidebar's edge */}
          <button
            onClick={togolSidebar}
            title={kecil ? 'Kembangkan menu' : 'Kecilkan menu'}
            aria-label={kecil ? 'Kembangkan menu' : 'Kecilkan menu'}
            aria-expanded={!kecil}
            className="absolute -right-3.5 top-9 flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white text-neutral-500 shadow-md transition-colors hover:text-emerald-700"
          >
            {/* One arrow that turns, instead of swapping two icons */}
            <ChevronsLeft
              size={15}
              className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${kecil ? 'rotate-180' : ''}`}
            />
          </button>
        </aside>

        {/* Mobile/tablet: compact top bar */}
        <div
          className={`flex w-full min-w-0 flex-col transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            kecil ? 'lg:ml-20' : 'lg:ml-72'
          }`}
        >
          <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5 lg:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-full border border-white/60 bg-white/40 p-2 text-neutral-700 shadow-md backdrop-blur-md"
            >
              <Menu size={20} />
            </button>
            <img src={apmLogo} alt="Logo APM" className="h-11 w-11 object-contain" />
          </header>

          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="px-4 pb-6 sm:px-8 sm:pb-8"
          >
            {children}
          </motion.main>
        </div>
      </div>

      {/* Mobile/tablet: slide-in drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white/95 shadow-xl backdrop-blur-md lg:hidden"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}