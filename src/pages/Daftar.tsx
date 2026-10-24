import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MailCheck, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import apmLogo from '../assets/apm-logo.png'

// Public self-registration. The account starts "Menunggu Kelulusan" (profile created by a
// trigger on the server, never by the browser) until a Super Admin approves it and picks a role.

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Sekurang-kurangnya 8 aksara', test: (pw) => pw.length >= 8 },
  { label: 'Satu huruf besar (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Satu huruf kecil (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Satu nombor (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Satu aksara khas (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600'

export function Daftar() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [jawatan, setJawatan] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const [berjaya, setBerjaya] = useState(false)
  const isStrongEnough = RULES.every((rule) => rule.test(password))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setRalat('')

    if (!nama.trim() || !jawatan.trim()) {
      setRalat('Sila isi Nama Penuh dan Jawatan / Unit.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setRalat('Alamat e-mel tidak sah.')
      return
    }
    if (!isStrongEnough) {
      setRalat('Kata laluan belum memenuhi semua syarat di bawah.')
      return
    }
    if (password !== confirm) {
      setRalat('Kata laluan tidak sepadan.')
      return
    }

    setLoading(true)
    const emel = email.trim().toLowerCase()
    const daftar = () =>
      supabase.auth.signUp({
        email: emel,
        password,
        options: {
          // After clicking the verification e-mail: back to the site, already logged in
          emailRedirectTo: `${window.location.origin}/`,
          // Read by the database trigger that creates the profile
          data: { full_name: nama.trim().toUpperCase(), jawatan_unit: jawatan.trim() },
        },
      })

    let { data, error } = await daftar()
    // Supabase answers "success" without creating anything when the e-mail already has an account
    let sudahWujud =
      (!error && !!data.user && data.user.identities?.length === 0) ||
      (!!error && /registered|exists/i.test(error.message))

    if (sudahWujud) {
      // A REJECTED request may register again: its old account is removed on the server
      // (only accounts with status "ditolak" can be removed this way), then we retry once
      const { data: dibuang } = await supabase.rpc('daftar_semula_ditolak', { p_email: emel })
      if (dibuang === true) {
        ;({ data, error } = await daftar())
        sudahWujud = !error && !!data.user && data.user.identities?.length === 0
      }
    }
    setLoading(false)

    if (sudahWujud) {
      setRalat('E-mel ini sudah didaftarkan. Sila log masuk.')
      return
    }
    if (error) {
      setRalat(
        error.status === 429
          ? 'Terlalu banyak cubaan. Sila cuba lagi selepas beberapa minit.'
          : 'Pendaftaran gagal. Sila cuba lagi.',
      )
      return
    }
    setBerjaya(true)
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/60 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex flex-col items-center">
          <img src={apmLogo} alt="Logo APM" className="h-16 w-16 object-contain" />
          <h1 className="mt-3 text-center text-base font-semibold text-neutral-900">Daftar Akaun</h1>
          <p className="mt-1 text-center text-xs text-neutral-500">APM Bahagian Pengurusan Bencana Operasi</p>
        </div>

        {berjaya ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <MailCheck size={24} />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-neutral-900">Sila semak e-mel anda</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Pautan pengesahan telah dihantar ke <strong>{email.trim().toLowerCase()}</strong>. Selepas pengesahan,
              akaun anda akan menunggu kelulusan Super Admin.
            </p>
            <p className="mt-2 text-xs text-neutral-400">Tiada e-mel? Semak folder Spam / Junk.</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
            >
              <ArrowLeft size={14} />
              Kembali ke Laman Utama
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Nama Penuh <span className="text-red-500">*</span>
              </label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className={`${inputClass} uppercase`} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                E-mel <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Jawatan / Unit <span className="text-red-500">*</span>
              </label>
              <input
                value={jawatan}
                onChange={(e) => setJawatan(e.target.value)}
                placeholder="cth. Pegawai Operasi, PKOP"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Kata Laluan <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
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
                Sahkan Kata Laluan <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>

            {ralat && <p className="text-sm text-red-600">{ralat}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? 'Mendaftar...' : 'DAFTAR'}
            </motion.button>

            <p className="text-center text-sm text-neutral-600">
              Sudah mempunyai akaun?{' '}
              <Link to="/" className="font-semibold text-emerald-700 hover:underline">
                Log masuk
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  )
}