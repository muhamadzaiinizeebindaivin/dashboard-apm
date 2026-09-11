import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

type LoginFormProps = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setRalat('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setRalat('E-mel atau kata laluan salah.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">E-mel</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Kata laluan
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        />
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? 'Log masuk...' : 'LOG MASUK'}
      </motion.button>
    </form>
  )
}
