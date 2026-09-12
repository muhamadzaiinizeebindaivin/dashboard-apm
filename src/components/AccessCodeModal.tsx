import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { AccessCodeForm } from './AccessCodeForm'

type AccessCodeModalProps = {
  open: boolean
  page: string
  label: string
  onClose: () => void
  onSuccess: () => void
}

export function AccessCodeModal({ open, page, label, onClose, onSuccess }: AccessCodeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={onClose}
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
              onClick={onClose}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <AccessCodeForm page={page} label={label} onSuccess={onSuccess} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}