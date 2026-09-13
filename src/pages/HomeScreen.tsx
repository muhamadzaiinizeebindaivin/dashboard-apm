import { useState } from 'react'
import { motion } from 'framer-motion'
import { LoginModal } from '../components/LoginModal'
import { StatCard } from '../components/StatCard'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'
import apmLogo from '../assets/apm-logo.png'

function Kandungan({ session }: { session: boolean }) {
  return (
    <>
      {!session && (
        <>
          <img src={apmLogo} alt="Logo APM" className="mx-auto h-24 w-24 object-contain" />
          <h1 className="mt-6 text-2xl font-semibold text-neutral-900">
            APM Bahagian Pengurusan Bencana Operasi
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
            Sistem pengurusan operasi bencana — NGO, Bencana, Sekretariat dan Logistik dalam
            satu portal.
          </p>
        </>
      )}

      {/* Data di bawah adalah contoh (fictif) untuk paparan sahaja */}
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <StatCard label="Negeri diliputi" value="16" detail="Semua negeri dan wilayah persekutuan di Malaysia." />
        <StatCard label="Kes aktif" value="238" detail="Kes bencana yang sedang dipantau di seluruh negara." />
        <StatCard label="NGO berdaftar" value="42" detail="Kumpulan NGO yang menyumbang bantuan bencana." />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="mx-auto mt-4 max-w-2xl rounded-2xl border border-white/60 bg-white/40 p-6 text-left shadow-lg backdrop-blur-md"
      >
        <h2 className="text-sm font-medium text-neutral-900">Aktiviti terkini</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-500">
          <li>• Laporan awal banjir — Kedah, dihantar 2 jam lalu</li>
          <li>• 3 kumpulan NGO baru berdaftar minggu ini</li>
          <li>• Bantuan makanan dihantar ke Pahang — status: selesai</li>
        </ul>
      </motion.div>
    </>
  )
}

export function HomeScreen() {
  const [modalOpen, setModalOpen] = useState(false)
  const { session } = useAuth()

  if (session) {
    return (
      <AppShell>
        <div className="text-center">
          <Kandungan session />
        </div>
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
          <Kandungan session={false} />
        </main>
      </div>

      <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={() => setModalOpen(false)} />
    </div>
  )
}
