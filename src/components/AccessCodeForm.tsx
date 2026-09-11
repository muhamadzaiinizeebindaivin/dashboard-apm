import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

type AccessCodeFormProps = {
  page: string
  label: string
  onSuccess: () => void
}

export function AccessCodeForm({ page, label, onSuccess }: AccessCodeFormProps) {
  const [code, setCode] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setRalat('')

    const { data, error } = await supabase.rpc('verify_page_code', {
      p_page: page,
      p_code: code,
    })

    if (error || !data) {
      setRalat('Kod akses salah.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Kod akses — {label}
        </label>
        <input
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
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
