import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowLeft, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type LoginFormProps = {
  onSuccess: () => void
}

const TUNGGU_SAAT = 60 // Supabase limits reset e-mails: one request per minute per form

const inputClass =
  'login-input w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-600'

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [mod, setMod] = useState<'masuk' | 'lupa'>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const [dihantar, setDihantar] = useState(false)
  const [baki, setBaki] = useState(0) // seconds before another reset e-mail can be requested

  useEffect(() => {
    if (baki <= 0) return
    const t = setTimeout(() => setBaki((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [baki])

  function tukarMod(baru: 'masuk' | 'lupa') {
    setMod(baru)
    setRalat('')
    setDihantar(false)
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setRalat('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setRalat(
        /not confirmed/i.test(error.message)
          ? 'E-mel belum disahkan. Sila klik pautan pengesahan dalam e-mel pendaftaran anda.'
          : 'E-mel atau kata laluan salah.',
      )
      setLoading(false)
      return
    }

    onSuccess()
  }

  async function handleLupa(e: FormEvent) {
    e.preventDefault()
    if (baki > 0) return
    setLoading(true)
    setRalat('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password?jenis=reset`,
    })
    setLoading(false)

    if (error) {
      setRalat(
        error.status === 429 || /security purposes|rate limit/i.test(error.message)
          ? 'Terlalu banyak permintaan. Sila cuba semula sebentar lagi.'
          : 'Gagal menghantar pautan. Semak sambungan internet dan cuba lagi.',
      )
      return
    }

    // Same message whether or not the e-mail has an account: the page never reveals who is registered
    setDihantar(true)
    setBaki(TUNGGU_SAAT)
  }

  if (mod === 'lupa') {
    return (
      <form onSubmit={handleLupa} className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Lupa kata laluan</p>
          <p className="mt-1 text-sm text-neutral-600">
            Masukkan e-mel akaun anda. Kami akan menghantar pautan untuk menetapkan semula kata laluan.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">E-mel</label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {dihantar && (
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <MailCheck size={16} className="mt-0.5 shrink-0" />
            Jika e-mel ini berdaftar, pautan untuk menetapkan semula kata laluan telah dihantar. Semak juga folder spam.
          </p>
        )}
        {ralat && <p className="text-sm text-red-600">{ralat}</p>}

        <motion.button
          type="submit"
          disabled={loading || baki > 0}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? 'Menghantar...' : baki > 0 ? `Hantar semula dalam ${baki} s` : 'HANTAR PAUTAN'}
        </motion.button>

        <button
          type="button"
          onClick={() => tukarMod('masuk')}
          className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          Kembali ke log masuk
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">E-mel</label>
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">Kata laluan</label>
          <button
            type="button"
            onClick={() => tukarMod('lupa')}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Lupa kata laluan?
          </button>
        </div>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? 'Log masuk...' : 'LOG MASUK'}
      </motion.button>

      <p className="text-center text-sm text-neutral-600">
        Belum mempunyai akaun?{' '}
        <Link to="/daftar" className="font-semibold text-emerald-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
    </form>
  )
}