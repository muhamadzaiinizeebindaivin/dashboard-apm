import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../hooks/useAuth'

type CreateUserModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateUserModal({ open, onClose, onSuccess }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('pkon')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: { email, full_name: fullName, role },
    })

    setSubmitting(false)
    if (fnError) {
      const body = await fnError.context?.json?.().catch(() => null)
      setError(body?.error ?? fnError.message)
      return
    }

    setFullName('')
    setEmail('')
    setRole('pkon')
    onSuccess()
  }

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
            className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <h2 className="mb-6 text-base font-semibold text-neutral-900">Tambah Pengguna</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-neutral-600">
                Nama penuh
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-neutral-600">
                Emel
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-neutral-600">
                Peranan
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="pkon">Admin (PKON)</option>
                  <option value="pkop">Super Admin (PKOP)</option>
                </select>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800 disabled:opacity-60"
              >
                {submitting ? 'Menghantar...' : 'Hantar Jemputan'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}