import { kunci } from './normalisasi'

// Similarity of two disaster names (0..1), ignoring case, spaces and punctuation:
// "BANJIR NEGERI KELANTAN 2026" vs "BANJIR KELANTAN 2026" -> high.
// Dice coefficient on letter pairs: cheap, and tolerant of small typos and extra words.
function pasangan(s: string): Map<string, number> {
  const t = kunci(s).replace(/ /g, '')
  const peta = new Map<string, number>()
  for (let i = 0; i < t.length - 1; i++) {
    const p = t.slice(i, i + 2)
    peta.set(p, (peta.get(p) ?? 0) + 1)
  }
  return peta
}

export function keserupaan(a: string, b: string): number {
  const pa = pasangan(a)
  const pb = pasangan(b)
  let sama = 0
  let jumlah = 0
  for (const n of pa.values()) jumlah += n
  for (const n of pb.values()) jumlah += n
  for (const [p, n] of pa) sama += Math.min(n, pb.get(p) ?? 0)
  return jumlah === 0 ? 0 : (2 * sama) / jumlah
}

// Closest known names: same state first, then most similar; clearly similar ones only
export function namaTerdekat<T extends { nama: string; negeri: string[] }>(
  nama: string,
  senarai: T[],
  negeri?: string,
  had = 3,
): T[] {
  return senarai
    .map((b) => ({ b, skor: keserupaan(nama, b.nama), samaNegeri: !!negeri && b.negeri.includes(negeri) }))
    .filter((x) => x.skor >= 0.55)
    .sort((x, y) => Number(y.samaNegeri) - Number(x.samaNegeri) || y.skor - x.skor)
    .slice(0, had)
    .map((x) => x.b)
}