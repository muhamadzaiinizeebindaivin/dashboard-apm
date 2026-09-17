import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import apmLogo from '../assets/apm-logo.png'

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Sekurang-kurangnya 8 aksara', test: (pw) => pw.length >= 8 },
  { label: 'Satu huruf besar (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Satu huruf kecil (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Satu nombor (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Satu aksara khas (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isStrongEnough = RULES.every((rule) => rule.test(password))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setRalat('')

    if (!isStrongEnough) {
      setRalat('Kata laluan belum memenuhi semua syarat di bawah.')
      return
    }
    if (password !== confirm) {
      setRalat('Kata laluan tidak sepadan.')
      return
    }

    setLoading(true)
    // The invite link's token is parsed by the SDK on load and turned into
    // a temporary session automatically — updateUser just needs that
    // session to already exist, which it does by the time this runs.
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setRalat('Pautan jemputan tidak sah atau telah tamat tempoh.')
      return
    }

    navigate('/sekretariat', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center">
          <img src={apmLogo} alt="Logo APM" className="h-16 w-16 object-contain" />
          <h1 className="mt-3 text-center text-base font-semibold text-neutral-900">
            Tetapkan Kata Laluan
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Kata laluan baharu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <ul className="mt-2 space-y-0.5 text-xs">
              {RULES.map((rule) => {
                const ok = rule.test(password)
                return (
                  <li key={rule.label} className={ok ? 'text-emerald-600' : 'text-neutral-400'}>
                    {ok ? '✓' : '○'} {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Sahkan kata laluan
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          {ralat && <p className="text-sm text-red-600">{ralat}</p>}

          <motion.button
            type="submit"
            disabled={loading || !isStrongEnough || password !== confirm}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : 'SIMPAN KATA LALUAN'}
          </motion.button>
        </div>
      </motion.form>
    </div>
  )
}