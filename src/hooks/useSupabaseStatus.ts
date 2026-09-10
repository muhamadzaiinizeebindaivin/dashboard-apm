import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Minimal connectivity check — confirms the Supabase client is configured
 * and can reach the project. Replace with real data hooks per feature
 * (e.g. useEmployees, useKpi) as the app grows.
 */
export function useSupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('connected')
      }
    })
  }, [])

  return { status, message }
}
