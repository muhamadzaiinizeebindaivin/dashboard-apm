import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  danger?: boolean
  loading?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Sahkan',
  cancelLabel = 'Batal',
  loadingLabel = 'Memproses...',
  danger = false,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 py-8"
          onClick={() => !loading && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  danger ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <AlertTriangle size={17} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
                <p className="mt-1 text-sm text-neutral-600">{message}</p>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-md transition-colors disabled:opacity-70 ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? loadingLabel : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}