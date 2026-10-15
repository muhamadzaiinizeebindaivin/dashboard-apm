import { pastikan } from './pastikan'

// Supabase returns at most 1000 rows per request, silently. These helpers load
// a query completely, in batches, and throw on any error (see pastikan.ts).

const SAIZ = 1000

type Respons = { data: unknown; error: { message: string } | null }
type BolehJulat = { range: (dari: number, hingga: number) => PromiseLike<Respons> }

// `bina` must return a NEW query on each call, sorted on a unique column last
// (e.g. .order('created_at').order('id')): batches then never skip or repeat a row.
export async function ambilSemua<T>(bina: () => BolehJulat): Promise<T[]> {
  const hasil: T[] = []
  for (let dari = 0; ; dari += SAIZ) {
    const data = (pastikan(await bina().range(dari, dari + SAIZ - 1)) as T[] | null) ?? []
    hasil.push(...data)
    if (data.length < SAIZ) return hasil
  }
}

// For .in('laporan_id', ids) with many ids: 100 ids per request (hundreds of
// UUIDs in one URL is too long for the server), each chunk loaded completely.
export async function dalamKepingan<T>(ids: string[], bina: (ids: string[]) => BolehJulat): Promise<T[]> {
  const hasil: T[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const kepingan = ids.slice(i, i + 100)
    hasil.push(...(await ambilSemua<T>(() => bina(kepingan))))
  }
  return hasil
}