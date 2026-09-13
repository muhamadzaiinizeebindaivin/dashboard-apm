import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, HandCoins, MapPin, FileWarning } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from './LoginForm'
import { AccessCodeForm } from './AccessCodeForm'
import apmLogo from '../assets/apm-logo.png'

type LoginModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const QUICK_LINKS = [
  { page: 'sumbangan', to: '/sumbangan', label: 'Sumbangan', icon: HandCoins },
  { page: 'paras', to: '/paras', label: 'PARAS', icon: MapPin },
  { page: 'laporan', to: '/laporan', label: 'Laporan', icon: FileWarning },
]

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<{ page: string; to: string; label: string } | null>(null)

  function handleClose() {
    setPending(null)
    onClose()
  }

  function handleAccessGranted() {
    if (!pending) return
    const to = pending.to
    setPending(null)
    onClose()
    navigate(to)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 shadow-inner">
                <img src={apmLogo} alt="Logo APM" className="h-14 w-14 object-contain" />
              </div>
              <h2 className="mt-4 text-center text-sm font-semibold leading-snug text-neutral-900">
                APM Bahagian Pengurusan
                <br />
                Bencana Operasi
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {pending ? (
                <motion.div
                  key="access-code"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => setPending(null)}
                    className="mb-4 flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
                  >
                    <ArrowLeft size={14} />
                    Kembali
                  </button>
                  <AccessCodeForm
                    page={pending.page}
                    label={pending.label}
                    onSuccess={handleAccessGranted}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <LoginForm onSuccess={onSuccess} />

                  <div className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-5">
                    {QUICK_LINKS.map(({ to, label, page, icon: Icon }) => (
                      <button
                        key={to}
                        onClick={() => setPending({ page, to, label })}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-white/60 bg-white/30 px-2 py-3 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:bg-emerald-700/10 hover:text-emerald-800"
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
