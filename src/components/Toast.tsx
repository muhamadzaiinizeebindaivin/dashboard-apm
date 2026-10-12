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

  // Centred by a full-width flex wrapper rather than translate-x: Framer Motion
  // writes its own `transform` for the y animation, which overrides Tailwind's
  // translate classes and pushed the toast off-centre (off-screen on mobile).
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[1400] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            role="status"
            className={`pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
                : 'border-red-200 bg-red-50/95 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <XCircle size={16} className="shrink-0" />
            )}
            <span className="min-w-0">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}