import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
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
  { page: 'sumbangan', to: '/sumbangan', label: 'Sumbangan' },
  { page: 'paras', to: '/paras', label: 'PARAS' },
  { page: 'laporan', to: '/laporan', label: 'Laporan' },
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <div className="mb-6 flex flex-col items-center">
              <img src={apmLogo} alt="Logo APM" className="h-14 w-14 object-contain" />
              <h2 className="mt-3 text-center text-sm font-semibold text-neutral-900">
                APM Bahagian Pengurusan Bencana Operasi
              </h2>
            </div>

            {pending ? (
              <>
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
              </>
            ) : (
              <>
                <LoginForm onSuccess={onSuccess} />

                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4">
                  {QUICK_LINKS.map((link) => (
                    <button
                      key={link.to}
                      onClick={() => setPending(link)}
                      className="rounded-lg border border-neutral-200 px-2 py-2 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}