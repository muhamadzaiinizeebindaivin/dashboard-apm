import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import { useAuth } from '../hooks/useAuth'
import { NAV_TABS } from '../lib/navTabs'
import { ROLE_LABEL } from '../lib/roles'
import { ConfirmModal } from './ConfirmModal'
import { Skeleton } from './Memuatkan'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'

// Registrations waiting for approval (badge on the Admin tab, Super Admin only)
function useBilPermohonan(aktif: boolean) {
  const [bil, setBil] = useState(0)
  const kira = useCallback(async () => {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'menunggu_kelulusan')
    setBil(count ?? 0)
  }, [])
  useEffect(() => {
    if (aktif) kira()
  }, [aktif, kira])
  useRealtime('bil-permohonan', ['profiles'], kira, { aktif })
  return aktif ? bil : 0
}

type SidebarContentProps = {
  onNavigate?: () => void
  kecil?: boolean // collapsed (desktop): icons only, labels as tooltips
}

// Collapse animation: nothing is added or removed from the layout. Icons keep the
// same position (fixed padding, centred in the 80 px collapsed width), labels stay
// in place and only fade out while the sidebar's edge clips them. Every part moves
// with the same duration and curve as the sidebar width.
const PERALIHAN = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'

export function SidebarContent({ onNavigate, kecil = false }: SidebarContentProps) {
  const { profile, signOut } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const TABS = NAV_TABS.filter((tab) => !!profile?.role && tab.allow.includes(profile.role))
  const bilPermohonan = useBilPermohonan(profile?.role === 'pkop')

  // Labels fade out at once when collapsing, and fade in a bit later when expanding
  const label = `whitespace-nowrap transition-opacity ${PERALIHAN} ${kecil ? 'opacity-0' : 'opacity-100 delay-100'}`

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pb-6 pt-6">
        <img src={apmLogo} alt="Logo APM" className="h-12 w-12 shrink-0 object-contain" />
        <span className={`text-sm font-semibold leading-tight text-neutral-900 ${label}`} aria-hidden={kecil}>
          APM
          <br />
          Bahagian Pengurusan
          <br />
          Bencana Operasi
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }} className="flex flex-col gap-2 px-4 py-2">
              {[70, 50, 65, 55, 60, 45, 50].map((w, i) => (
                <Skeleton key={i} style={{ width: `${w}%` }} className="h-3 rounded-full" />
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
              {TABS.map((tab) => {
                const Ikon = tab.icon
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.to === '/'}
                    onClick={onNavigate}
                    title={kecil ? tab.label : undefined}
                    aria-label={tab.label}
                    className="relative"
                  >
                    {({ isActive }) => (
                      <span
                        className={`relative z-10 flex items-center gap-3 rounded-xl px-[19px] py-2.5 text-sm font-medium transition-colors ${
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
                        <Ikon size={18} className="shrink-0" />
                        <span className={label}>{tab.label}</span>
                        {tab.to === '/admin' && bilPermohonan > 0 && (
                          <span
                            title={`${bilPermohonan} permohonan akaun menunggu kelulusan`}
                            className={`rounded-full bg-amber-500 text-[11px] font-semibold text-white ${
                              kecil ? 'absolute right-3 top-1.5 h-2.5 w-2.5' : 'ml-auto px-1.5 py-0.5'
                            }`}
                          >
                            {kecil ? '' : bilPermohonan}
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="border-t border-white/60 px-3 py-4">
        {/* Role badge folds its height smoothly instead of popping in or out */}
        <div
          className={`grid transition-[grid-template-rows,opacity] ${PERALIHAN} ${
            profile && !kecil ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            {profile && (
              <span className="mb-3 ml-2 inline-block whitespace-nowrap rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white">
                {profile.role ? (ROLE_LABEL[profile.role] ?? profile.role) : 'Menunggu Kelulusan'}
              </span>
            )}
          </div>
        </div>
        <NavLink
          to="/profil"
          onClick={onNavigate}
          title={kecil ? 'Profil Saya' : undefined}
          aria-label="Profil Saya"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-xl px-[19px] py-2.5 text-sm font-medium ${
              isActive ? 'bg-emerald-700 text-white' : 'text-neutral-700 hover:bg-white/60'
            }`
          }
        >
          <UserCircle size={18} className="shrink-0" />
          <span className={label}>Profil Saya</span>
        </NavLink>
        <button
          onClick={() => setConfirmSignOut(true)}
          title={kecil ? 'Log Keluar' : undefined}
          aria-label="Log Keluar"
          className="flex w-full items-center gap-3 rounded-xl px-[19px] py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} className="shrink-0" />
          <span className={label}>Log Keluar</span>
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