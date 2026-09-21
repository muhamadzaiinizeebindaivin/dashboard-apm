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