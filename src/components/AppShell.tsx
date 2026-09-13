import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { SidebarContent } from './Sidebar'
import apmLogo from '../assets/apm-logo.png'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative flex">
        {/* Persistent sidebar — desktop only */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-white/60 lg:bg-white/40 lg:shadow-lg lg:backdrop-blur-md">
          <SidebarContent />
        </aside>

        {/* Mobile/tablet: compact top bar */}
        <div className="flex w-full flex-col lg:ml-72">
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
