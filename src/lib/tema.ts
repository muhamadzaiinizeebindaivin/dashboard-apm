import { useSyncExternalStore } from 'react'

// Theme: Terang (light), Gelap (dark) or Ikut sistem (follows the device; the default).
// One shared store for the whole app; the choice is remembered on this device.
// index.html applies the same rule before React starts, so the page never flashes white.

export type Tema = 'terang' | 'gelap' | 'sistem'

const KUNCI = 'apm-bo:tema'
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function baca(): Tema {
  try {
    const v = localStorage.getItem(KUNCI)
    if (v === 'terang' || v === 'gelap' || v === 'sistem') return v
  } catch {
    // storage blocked: follow the device
  }
  return 'sistem'
}

function terapkan(t: Tema) {
  const gelap = t === 'gelap' || (t === 'sistem' && !!mq?.matches)
  document.documentElement.classList.toggle('dark', gelap)
}

let semasa: Tema = baca()
const pendengar = new Set<() => void>()

export function setTema(t: Tema) {
  semasa = t
  try {
    localStorage.setItem(KUNCI, t)
  } catch {
    // not remembered, still applied for this visit
  }
  terapkan(t)
  pendengar.forEach((f) => f())
}

// Applied once when the app loads, then follows the device while on "Ikut sistem"
if (typeof window !== 'undefined') {
  terapkan(semasa)
  mq?.addEventListener('change', () => {
    if (semasa === 'sistem') terapkan('sistem')
  })
}

export function useTema() {
  const tema = useSyncExternalStore(
    (f) => {
      pendengar.add(f)
      return () => pendengar.delete(f)
    },
    () => semasa,
  )
  return { tema, setTema }
}