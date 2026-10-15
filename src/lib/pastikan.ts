// Report generators: a failed query must stop the report instead of producing
// a file with silently missing data. Returns the data, or throws on an error.
// Usage: const data = await supabase.from('x').select('*').then(pastikan)
// The callers (Jana PDF / Excel / Laporan Nasional buttons) already catch it
// and show "Gagal menjana…".
export function pastikan<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message)
  return res.data
}