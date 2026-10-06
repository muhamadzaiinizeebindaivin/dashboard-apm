import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { simpanKod, simpanPetugas, ambilPetugas } from '../lib/accessCode'

type AccessCodeFormProps = {
  page: string
  label: string
  onSuccess: () => void
  withPetugas?: boolean
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600'

export function AccessCodeForm({ page, label, onSuccess, withPetugas = false }: AccessCodeFormProps) {
  const [code, setCode] = useState('')
  const [nama, setNama] = useState(() => ambilPetugas()?.nama ?? '')
  const [pangkat, setPangkat] = useState(() => ambilPetugas()?.pangkat ?? '')
  const [noTel, setNoTel] = useState(() => ambilPetugas()?.noTel ?? '')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setRalat('')

    if (withPetugas) {
      if (!nama.trim() || !pangkat.trim() || !noTel.trim()) {
        setRalat('Sila isi Nama, Pangkat dan No. Tel.')
        return
      }
      if (!/^\+?[0-9\s-]{9,15}$/.test(noTel.trim())) {
        setRalat('No. Tel tidak sah.')
        return
      }
    }

    setLoading(true)

    const { data, error } = await supabase.rpc('verify_page_code', {
      p_page: page,
      p_code: code,
    })

    if (error || !data) {
      setRalat('Kod akses salah.')
      setLoading(false)
      return
    }

    simpanKod(page, code)
    if (withPetugas) {
      simpanPetugas({ nama: nama.trim(), pangkat: pangkat.trim(), noTel: noTel.trim() })
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-center text-lg font-semibold tracking-wide text-neutral-900">
        {label.toUpperCase()}
      </h3>
      {withPetugas && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nama
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Pangkat
            </label>
            <input
              type="text"
              value={pangkat}
              onChange={(e) => setPangkat(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              No. Tel
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={noTel}
              onChange={(e) => setNoTel(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Kod akses
        </label>
        <input
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus={!withPetugas}
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
        {loading ? 'Menyemak...' : 'SAHKAN'}
      </motion.button>
    </form>
  )
}
