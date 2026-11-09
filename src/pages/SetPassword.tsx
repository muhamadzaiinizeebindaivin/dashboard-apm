import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, LinkIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import apmLogo from '../assets/apm-logo.png'

// Two uses, same page:
// - invitation link (Admin invites a user)       -> /set-password
// - "Lupa kata laluan?" link from the login box  -> /set-password?jenis=reset
// The link's token is turned into a temporary session by the SDK when the page loads;
// updateUser then changes the password of that session's account.

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Sekurang-kurangnya 8 aksara', test: (pw) => pw.length >= 8 },
  { label: 'Satu huruf besar (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Satu huruf kecil (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Satu nombor (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Satu aksara khas (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

type Keadaan = 'memuat' | 'sedia' | 'tidak_sah'

// An expired or already-used link comes back with ?error=... or #error=...
function adaRalatDalamPautan() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  return !!(hash.get('error') || hash.get('error_code') || query.get('error') || query.get('error_code'))
}

export function SetPassword() {
  const [params] = useSearchParams()
  const reset = params.get('jenis') === 'reset'
  const [keadaan, setKeadaan] = useState<Keadaan>('memuat')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isStrongEnough = RULES.every((rule) => rule.test(password))

  // Decide on arrival whether the link is still valid, instead of failing only on "Simpan"
  useEffect(() => {
    if (adaRalatDalamPautan()) {
      setKeadaan('tidak_sah')
      return
    }
    let aktif = true
    const { data: langganan } = supabase.auth.onAuthStateChange((_e, sesi) => {
      if (aktif && sesi) setKeadaan('sedia')
    })
    // getSession waits for the SDK to finish reading the link
    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return
      if (data.session) setKeadaan('sedia')
      else setTimeout(() => aktif && setKeadaan((k) => (k === 'memuat' ? 'tidak_sah' : k)), 3000)
    })
    return () => {
      aktif = false
      langganan.subscription.unsubscribe()
    }
  }, [])

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
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setRalat(
        /different from the old/i.test(error.message)
          ? 'Kata laluan baharu mesti berbeza daripada kata laluan lama.'
          : 'Pautan tidak sah atau telah tamat tempoh. Sila minta pautan baharu.',
      )
      return
    }

    navigate(reset ? '/' : '/sekretariat', { replace: true })
  }

  const tajuk = reset ? 'Tetapkan Semula Kata Laluan' : 'Tetapkan Kata Laluan'

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center">
          <img src={apmLogo} alt="Logo APM" className="h-16 w-16 object-contain" />
          <h1 className="mt-3 text-center text-base font-semibold text-neutral-900">{tajuk}</h1>
        </div>

        {keadaan === 'memuat' && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Menyemak pautan...
          </div>
        )}

        {keadaan === 'tidak_sah' && (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <LinkIcon size={18} />
            </span>
            <p className="text-sm text-neutral-700">Pautan ini tidak sah atau telah tamat tempoh.</p>
            <p className="text-xs text-neutral-500">
              {reset
                ? 'Sila minta pautan baharu melalui "Lupa kata laluan?" di kotak log masuk.'
                : 'Sila hubungi pentadbir untuk mendapatkan jemputan baharu.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              KE LAMAN UTAMA
            </button>
          </div>
        )}

        {keadaan === 'sedia' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Kata laluan baharu</label>
              <input
                type="password"
                required
                autoComplete="new-password"
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
              <label className="mb-1 block text-sm font-medium text-neutral-700">Sahkan kata laluan</label>
              <input
                type="password"
                required
                autoComplete="new-password"
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
        )}
      </motion.form>
    </div>
  )
}