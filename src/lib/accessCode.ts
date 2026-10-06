const key = (page: string) => `kod-akses:${page}`

export function simpanKod(page: string, code: string) {
  try {
    sessionStorage.setItem(key(page), code)
  } catch {
    // storage unavailable, the server check still applies
  }
}

export function ambilKod(page: string): string {
  try {
    return sessionStorage.getItem(key(page)) ?? ''
  } catch {
    return ''
  }
}

export function padamKod(page: string) {
  try {
    sessionStorage.removeItem(key(page))
  } catch {
    // ignore
  }
}

export type Petugas = { nama: string; pangkat: string; noTel: string }

const PETUGAS_KEY = 'paras-petugas'

export function simpanPetugas(p: Petugas) {
  try {
    sessionStorage.setItem(PETUGAS_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable
  }
}

export function ambilPetugas(): Petugas | null {
  try {
    const raw = sessionStorage.getItem(PETUGAS_KEY)
    return raw ? (JSON.parse(raw) as Petugas) : null
  } catch {
    return null
  }
}