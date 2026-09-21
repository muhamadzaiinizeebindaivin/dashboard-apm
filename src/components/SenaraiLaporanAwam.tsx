import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileSpreadsheet, Trash2, Home, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { ConfirmModal } from './ConfirmModal'
import { Toast } from './Toast'
import type { ToastState } from './Toast'
import { supabase } from '../lib/supabase'
import {
  TARIKH_MASA_FIELD,
  KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  PENYEDIA_FIELDS,
  PERHATIAN_FIELDS,
} from '../lib/laporanBencana'
import type { FieldDef, LaporanBencanaRow } from '../lib/laporanBencana'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { janaExcelLaporan } from '../lib/janaExcel'

type SenaraiLaporanAwamProps = {
  jenis: 'awal' | 'semasa'
  label: string
}

function formatNilai(def: FieldDef, v: string | null) {
  if (!v) return '—'
  return def.type === 'datetime' ? new Date(v).toLocaleString('ms-MY') : v
}

function Bahagian({ tajuk, fields, row }: { tajuk: string; fields: FieldDef[]; row: LaporanBencanaRow }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{tajuk}</h3>
      <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
            <dt className="text-xs text-neutral-500">
              {f.no} {f.label}
            </dt>
            <dd className="whitespace-pre-wrap text-sm text-neutral-800">{formatNilai(f, row[f.key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function SenaraiLaporanAwam({ jenis, label }: SenaraiLaporanAwamProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LaporanBencanaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [terbuka, setTerbuka] = useState<string | null>(null)
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [menjana, setMenjana] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LaporanBencanaRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('laporan_bencana')
      .select('*')
      .eq('jenis_laporan', jenis)
      .order('created_at', { ascending: false })

    setRows((data as LaporanBencanaRow[]) ?? [])
    setLoading(false)
  }, [jenis])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  useEffect(() => {
    const channel = supabase
      .channel(`laporan-bencana-${jenis}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'laporan_bencana', filter: `jenis_laporan=eq.${jenis}` },
        (payload) => {
          const baru = payload.new as LaporanBencanaRow
          setRows((prev) => (prev.some((r) => r.id === baru.id) ? prev : [baru, ...prev]))
          setToast({ type: 'success', message: 'Laporan baru diterima.' })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'laporan_bencana' },
        (payload) => {
          const id = (payload.old as { id?: string }).id
          if (id) setRows((prev) => prev.filter((r) => r.id !== id))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jenis])

  const rowsTapis = tapisNegeri ? rows.filter((r) => r.negeri === tapisNegeri) : rows

  async function handleJanaExcel() {
    setMenjana(true)
    try {
      const hingga = new Date()
      const dari = new Date(hingga.getTime() - 2 * 60 * 60 * 1000)

      let query = supabase
        .from('laporan_bencana')
        .select('*')
        .eq('jenis_laporan', jenis)
        .gte('created_at', dari.toISOString())
        .order('created_at', { ascending: true })
      if (tapisNegeri) query = query.eq('negeri', tapisNegeri)

      const { data, error } = await query
      if (error) {
        setToast({ type: 'error', message: 'Gagal mengambil laporan. Sila cuba lagi.' })
        return
      }

      const senarai = (data as LaporanBencanaRow[]) ?? []
      if (senarai.length === 0) {
        setToast({ type: 'error', message: 'Tiada laporan dalam 2 jam lepas.' })
        return
      }

      await janaExcelLaporan({ rows: senarai, jenis, jenisLabel: label, negeri: tapisNegeri, dari, hingga })
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana Excel. Sila cuba lagi.' })
    } finally {
      setMenjana(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleteError('')
    setDeleting(true)

    const { error } = await supabase.from('laporan_bencana').delete().eq('id', pendingDelete.id)
    setDeleting(false)

    if (error) {
      setDeleteError('Gagal memadam. Sila cuba lagi.')
      return
    }

    const id = pendingDelete.id
    setPendingDelete(null)
    setToast({ type: 'success', message: 'Laporan berjaya dipadam.' })

    setFadingId(id)
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => r.id !== id))
      setFadingId(null)
    }, 300)
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-emerald-700"
            >
              <Home size={13} />
              Portal
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <button
              onClick={() => navigate('/sekretariat')}
              className="text-neutral-400 transition-colors hover:text-emerald-700"
            >
              Sekretariat
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">{label}</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{label}</h1>
        </div>

        <button
          onClick={() => navigate('/sekretariat')}
          className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>

      <DashboardCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-neutral-900">Laporan Diterima</h2>

          <div className="flex flex-wrap items-center gap-3">
            {!loading && <span className="text-xs text-neutral-500">{rowsTapis.length} laporan</span>}
            <select
              value={tapisNegeri}
              onChange={(e) => setTapisNegeri(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua negeri</option>
              {NEGERI_LIST.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={handleJanaExcel}
              disabled={menjana}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <FileSpreadsheet size={15} />
              {menjana ? 'Menjana...' : 'Jana Excel (2 jam lepas)'}
            </button>
          </div>
        </div>

        {loading ? (
          <ul className="mt-4 divide-y divide-neutral-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-neutral-200" />
                <div className="space-y-1.5">
                  <span className="block h-3 w-40 animate-pulse rounded-full bg-neutral-200" />
                  <span className="block h-2.5 w-24 animate-pulse rounded-full bg-neutral-200" />
                </div>
              </li>
            ))}
          </ul>
        ) : rowsTapis.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            {tapisNegeri ? 'Tiada laporan untuk negeri ini.' : 'Tiada laporan diterima lagi.'}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {rowsTapis.map((row) => {
              const buka = terbuka === row.id
              const tajuk = row.nama_bencana || row.jenis_bencana || 'Laporan'
              const lokasi = [row.negeri, row.daerah].filter(Boolean).join(' · ')
              return (
                <li
                  key={row.id}
                  className={`py-3 transition-all duration-300 ${fadingId === row.id ? 'opacity-0' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setTerbuka(buka ? null : row.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <FileText size={18} className="shrink-0 text-emerald-700" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-800">{tajuk}</p>
                        <p className="truncate text-xs text-neutral-400">
                          {lokasi && `${lokasi} · `}
                          {new Date(row.created_at).toLocaleString('ms-MY')}
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`ml-auto shrink-0 text-neutral-400 transition-transform ${buka ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => setPendingDelete(row)}
                      title="Padam"
                      className="shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {buka && (
                    <div className="mt-4 space-y-5 rounded-xl border border-neutral-100 bg-white/60 p-4">
                      <Bahagian tajuk="Tarikh / Masa" fields={[TARIKH_MASA_FIELD]} row={row} />
                      <Bahagian tajuk="Maklumat Kejadian" fields={KEJADIAN_FIELDS} row={row} />
                      <Bahagian tajuk="Hal-hal Lain" fields={[HAL_LAIN_FIELD]} row={row} />
                      <Bahagian tajuk="Disediakan Oleh" fields={PENYEDIA_FIELDS} row={row} />
                      <Bahagian tajuk="Telah Diberi Perhatian" fields={PERHATIAN_FIELDS} row={row} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DashboardCard>

      <ConfirmModal
        open={!!pendingDelete}
        title="Padam Laporan"
        message={`Padam laporan "${pendingDelete?.nama_bencana || pendingDelete?.jenis_bencana || ''}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null)
          setDeleteError('')
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}