import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { SumbanganForm } from './SumbanganForm'
import type { ExistingSumbangan } from './SumbanganForm'

type TambahSumbanganModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  negeriTetap?: string
  existing?: ExistingSumbangan
}

export function TambahSumbanganModal({ open, onClose, onSuccess, negeriTetap, existing }: TambahSumbanganModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <h2 className="mb-6 text-base font-semibold text-neutral-900">
              {existing ? 'Kemas Kini Sumbangan' : 'Tambah Sumbangan'}
            </h2>

            <SumbanganForm onSuccess={onSuccess} negeriTetap={negeriTetap} existing={existing} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
