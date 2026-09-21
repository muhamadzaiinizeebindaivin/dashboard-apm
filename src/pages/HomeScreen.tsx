import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { ShieldCheck, HandCoins, MapPin, Users, AlertTriangle, ClipboardList, Truck, UserCog, ChevronRight } from 'lucide-react'
import { LoginModal } from '../components/LoginModal'
import { AppShell } from '../components/AppShell'
import { DokumenAwamCard } from '../components/DokumenAwamCard'
import { useAuth } from '../hooks/useAuth'
import { NAV_TABS } from '../lib/navTabs'
import { ROLE_LABEL } from '../lib/roles'
import apmLogo from '../assets/apm-logo.png'



const MODULE_META: Record<string, { icon: typeof HandCoins; className: string }> = {
  '/ngo': { icon: Users, className: 'bg-sky-100 text-sky-700' },
  '/bencana': { icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
  '/sekretariat': { icon: ClipboardList, className: 'bg-violet-100 text-violet-700' },
  '/logistik': { icon: Truck, className: 'bg-amber-100 text-amber-700' },
  '/senarai-sumbangan': { icon: HandCoins, className: 'bg-emerald-100 text-emerald-700' },
  '/senarai-paras': { icon: MapPin, className: 'bg-cyan-100 text-cyan-700' },
  '/admin': { icon: UserCog, className: 'bg-neutral-200 text-neutral-700' },
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{eyebrow}</span>
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
    </div>
  )
}

function KandunganAwam() {
  return (
    <>
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 shadow-inner">
        <img src={apmLogo} alt="Logo APM" className="h-16 w-16 object-contain" />
      </div>

      <div className="mx-auto mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        <ShieldCheck size={14} />
        Sistem Rasmi APM
      </div>

      <h1 className="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">
        Bahagian Pengurusan Bencana Operasi
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Sistem pengurusan operasi bencana — NGO, Bencana, Sekretariat dan Logistik dalam
        satu portal.
      </p>



      <div className="mx-auto mt-10 max-w-2xl text-left">
        <SectionTitle eyebrow="Rujukan" title="Dokumen Rasmi" />
        <DokumenAwamCard />
      </div>
    </>
  )
}

function KandunganLogMasuk() {
  const { profile } = useAuth()
  const modul = NAV_TABS.filter((tab) => tab.to !== '/' && profile && tab.allow.includes(profile.role))
  const jam = new Date().getHours()
  const salam = jam < 12 ? 'Selamat pagi' : jam < 18 ? 'Selamat tengah hari' : 'Selamat petang'

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <p className="text-sm text-neutral-500">{salam},</p>
          <h1 className="text-xl font-semibold text-neutral-900">
            {profile?.full_name || 'Pengguna'}
          </h1>
        </div>
        {profile && (
          <span className="rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white shadow-md">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </span>
        )}
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Navigasi Pantas" title="Modul Anda" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {modul.map((tab, i) => {
            const meta = MODULE_META[tab.to] ?? { icon: ClipboardList, className: 'bg-neutral-100 text-neutral-600' }
            const Icon = meta.icon
            return (
              <motion.div
                key={tab.to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.2 } }}
                whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <NavLink
                  to={tab.to}
                  className="group flex h-full items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md transition-colors hover:border-emerald-500"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.className}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-neutral-800">{tab.label}</span>
                  <ChevronRight
                    size={15}
                    className="shrink-0 text-neutral-300 transition-colors group-hover:text-emerald-600"
                  />
                </NavLink>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Rujukan" title="Dokumen Rasmi" />
        <DokumenAwamCard />
      </div>
    </>
  )
}

export function HomeScreen() {
  const [modalOpen, setModalOpen] = useState(false)
  const { session } = useAuth()

  if (session) {
    return (
      <AppShell>
        <KandunganLogMasuk />
      </AppShell>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
          <img src={apmLogo} alt="Logo APM" className="h-11 w-11 object-contain sm:h-14 sm:w-14" />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Log Masuk
          </motion.button>
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-center">
          <KandunganAwam />
        </main>
      </div>

      <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={() => setModalOpen(false)} />
    </div>
  )
}