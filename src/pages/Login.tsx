import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import apmLogo from '../assets/apm-logo.png'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setRalat('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setRalat('E-mel atau kata laluan salah.')
      setLoading(false)
      return
    }

    navigate('/bencana', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center">
          <img src={apmLogo} alt="Logo APM" className="h-16 w-16 object-contain" />
          <h1 className="mt-3 text-center text-base font-semibold text-neutral-900">
            APM Bahagian Pengurusan Bencana Operasi
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              E-mel
            </label>
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
        </div>
      </motion.form>
    </div>
  )
}
