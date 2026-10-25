import { useAuth } from './useAuth'

// The state a PKON is limited to (null for PKOP). The database already returns only
// that state's data; screens use this to hide or lock their Negeri filter.
export function useNegeriTetap(): string | null {
  const { profile } = useAuth()
  return profile?.role === 'pkon' ? (profile.negeri ?? null) : null
}