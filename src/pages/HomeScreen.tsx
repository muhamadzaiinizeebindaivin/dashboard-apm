import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShieldCheck, FileText, FileSpreadsheet, HandCoins, MapPin, FileWarning } from 'lucide-react'
import { LoginModal } from '../components/LoginModal'
import type { PautanAwam } from '../components/LoginModal'
import { PemilihTema } from '../components/PemilihTema'
import { AppShell } from '../components/AppShell'
import { DokumenAwamCard } from '../components/DokumenAwamCard'
import { AmaranBanner } from '../components/AmaranBanner'
import { PapanUtama } from '../components/PapanUtama'
import { useAuth } from '../hooks/useAuth'
import apmLogo from '../assets/apm-logo.png'

const QUICK_LINKS = [
  { page: 'sumbangan', to: '/sumbangan', label: 'Sumbangan', icon: HandCoins },
  { page: 'paras', to: '/paras', label: 'PARAS', icon: MapPin, withPetugas: true },
  { page: 'laporan', to: '/laporan', label: 'Laporan', icon: FileWarning },
]

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
        Pusat Kawalan Operasi Pusat
      </h1>
      <p className="mt-1 text-sm font-medium text-neutral-600 sm:text-base">
        Bahagian Pengurusan Bencana Operasi
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Sistem pengurusan operasi bencana — NGO, Bencana, Sekretariat dan Logistik dalam
        satu portal.
      </p>

      {/* Situation at a glance: map (display only) + figures */}
      <div className="mt-8 text-left">
        <PapanUtama />
      </div>

      <div className="mx-auto mt-10 max-w-5xl text-left">
        <SectionTitle eyebrow="Rujukan" title="Dokumen Rasmi" />
        <DokumenAwamCard />
      </div>
    </>
  )
}

function KandunganLogMasuk() {
  const { profile } = useAuth()
  const jam = new Date().getHours()
  const salam = jam < 12 ? 'Selamat pagi' : jam < 18 ? 'Selamat tengah hari' : 'Selamat petang'

  return (
    <>
      <AmaranBanner />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <p className="text-sm text-neutral-500">{salam},</p>
          <h1 className="text-xl font-semibold text-neutral-900">
            {profile?.full_name || 'Pengguna'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Send a report from inside the dashboard (same upload + review as /laporan, no access code) */}
          <Link
            to="/hantar-laporan?jenis=awal"
            className="flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-orange-600"
          >
            <FileText size={15} />
            Hantar Laporan Awal
          </Link>
          <Link
            to="/hantar-laporan?jenis=semasa"
            className="flex items-center gap-1.5 rounded-full bg-[#0b2a5c] px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#123a7a]"
          >
            <FileSpreadsheet size={15} />
            Hantar Laporan Semasa
          </Link>
        </div>
      </div>

      {/* Situation at a glance: map (display only, editing stays in the Bencana tab) + figures */}
      <div className="mt-6">
        <PapanUtama />
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
  const [pending, setPending] = useState<PautanAwam | null>(null)
  const { session } = useAuth()

  if (session) {
    return (
      <AppShell>
        <KandunganLogMasuk />
      </AppShell>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
          <img src={apmLogo} alt="Logo APM" className="h-11 w-11 object-contain sm:h-14 sm:w-14" />
          <div className="flex items-center gap-2">
            <PemilihTema />
            {QUICK_LINKS.map(({ to, label, page, icon: Icon, withPetugas }) => (
              <button
                key={to}
                onClick={() => {
                  setPending({ page, to, label, withPetugas })
                  setModalOpen(true)
                }}
                title={label}
                aria-label={label}
                className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/40 px-3 py-2 text-sm font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:bg-emerald-700/10 hover:text-emerald-800"
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setPending(null)
                setModalOpen(true)
              }}
              className="rounded-full bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Log Masuk
            </motion.button>
          </div>
        </header>

        {/* Active disasters, visible before login too */}
        <div className="mx-auto max-w-6xl px-4">
          <AmaranBanner awam />
        </div>

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 text-center">
          <KandunganAwam />
        </main>
      </div>

      <LoginModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
        pending={pending}
        setPending={setPending}
      />
    </div>
  )
}