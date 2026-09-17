import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'

export type ToastState = { type: 'success' | 'error'; message: string } | null

type ToastProps = {
  toast: ToastState
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return createPortal(
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`fixed left-1/2 top-6 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
              : 'border-red-200 bg-red-50/95 text-red-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}