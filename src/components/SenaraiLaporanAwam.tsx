import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  FileDown,
  Trash2,
  Home,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  MapPin,
  Clock3,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Inbox,
} from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { ConfirmModal } from './ConfirmModal'
import { Toast } from './Toast'
import type { ToastState } from './Toast'
import { supabase } from '../lib/supabase'
import { TARIKH_MASA_FIELD, KEJADIAN_FIELDS, HAL_LAIN_FIELD, PENYEDIA_FIELDS } from '../lib/laporanBencana'
import { SEMASA_MAKLUMAT_FIELDS, SEMASA_PENYEDIA_FIELDS, TREND_LABEL } from '../lib/laporanBencana'
import type { FieldDef, LaporanBencanaRow } from '../lib/laporanBencana'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { janaRekodKejadian } from '../lib/janaRekodKejadian'

type SenaraiLaporanAwamProps = {
  jenis: 'awal' | 'semasa'
  label: string
}

function formatNilai(def: FieldDef, v: string | null) {
  if (!v) return '—'
  return def.type === 'datetime' ? new Date(v).toLocaleString('ms-MY') : v
}

type PpsRow = {
  id: string
  zon: string | null
  negeri: string | null
  daerah: string | null
  pps: string | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
}

function Seksyen({ tajuk, aksi, children }: { tajuk: string; aksi?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{tajuk}</h3>
        {aksi}
      </div>
      {children}
    </div>
  )
}

function Bahagian({ tajuk, fields, row }: { tajuk: string; fields: FieldDef[]; row: LaporanBencanaRow }) {
  return (
    <Seksyen tajuk={tajuk}>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
            <dt className="text-xs text-neutral-500">
              {f.no} {f.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-800">{formatNilai(f, row[f.key])}</dd>
          </div>
        ))}
      </dl>
    </Seksyen>
  )
}

export function SenaraiLaporanAwam({ jenis, label }: SenaraiLaporanAwamProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LaporanBencanaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [terbuka, setTerbuka] = useState<string | null>(null)
  const [ppsMap, setPpsMap] = useState<Record<string, PpsRow[]>>({})
  const [loadingPps, setLoadingPps] = useState<Record<string, boolean>>({})
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [pendingDelete, setPendingDelete] = useState<LaporanBencanaRow | null>(null)
  const [sahkanId, setSahkanId] = useState<string | null>(null)
  const [sahkanNilai, setSahkanNilai] = useState({ nama: '', jawatan: '', telefon: '' })
  const [menyahkan, setMenyahkan] = useState(false)
  const [sahkanRalat, setSahkanRalat] = useState('')
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

  const [menjanaPdf, setMenjanaPdf] = useState(false)

  async function handleJanaPdf() {
    setMenjanaPdf(true)
    try {
      await janaRekodKejadian(rowsTapis, jenis, label, tapisNegeri)
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana PDF. Sila cuba lagi.' })
    } finally {
      setMenjanaPdf(false)
    }
  }

  function pengesahanBlok(row: LaporanBencanaRow) {
    if (row.perhatian_nama) {
      return (
        <Seksyen tajuk="Disahkan Oleh">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-neutral-500">Nama</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_nama}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Jawatan</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_jawatan || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">No. Telefon</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_telefon || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Masa Pengesahan</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">
                {row.perhatian_masa ? new Date(row.perhatian_masa).toLocaleString('ms-MY') : '—'}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => bukaSahkan(row)}
            className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-700"
          >
            Kemaskini Pengesahan
          </button>
        </Seksyen>
      )
    }

    return (
      <Seksyen tajuk="Pengesahan">
        <p className="text-sm text-neutral-500">Laporan ini belum disahkan.</p>
        <button
          onClick={() => bukaSahkan(row)}
          className="mt-3 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800"
        >
          Sahkan
        </button>
      </Seksyen>
    )
  }

  async function bukaTutup(id: string) {
    const akanBuka = terbuka !== id
    setTerbuka(akanBuka ? id : null)

    if (akanBuka && jenis === 'semasa' && !ppsMap[id]) {
      setLoadingPps((p) => ({ ...p, [id]: true }))
      const { data } = await supabase.from('laporan_pps').select('*').eq('laporan_id', id).order('created_at')
      setPpsMap((p) => ({ ...p, [id]: (data as PpsRow[]) ?? [] }))
      setLoadingPps((p) => ({ ...p, [id]: false }))
    }
  }

  function bukaSahkan(row: LaporanBencanaRow) {
    setSahkanId(row.id)
    setSahkanNilai({
      nama: row.perhatian_nama ?? '',
      jawatan: row.perhatian_jawatan ?? '',
      telefon: row.perhatian_telefon ?? '',
    })
    setSahkanRalat('')
  }

  async function hantarSahkan() {
    if (!sahkanId) return
    if (!sahkanNilai.nama.trim()) {
      setSahkanRalat('Sila isi Nama.')
      return
    }

    setMenyahkan(true)
    const { error } = await supabase.rpc('sahkan_laporan', {
      p_id: sahkanId,
      p_nama: sahkanNilai.nama.trim(),
      p_jawatan: sahkanNilai.jawatan.trim(),
      p_telefon: sahkanNilai.telefon.trim(),
    })
    setMenyahkan(false)

    if (error) {
      setSahkanRalat('Gagal mengesahkan. Sila cuba lagi.')
      return
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === sahkanId
          ? {
              ...r,
              perhatian_nama: sahkanNilai.nama.trim(),
              perhatian_jawatan: sahkanNilai.jawatan.trim(),
              perhatian_telefon: sahkanNilai.telefon.trim(),
              perhatian_masa: new Date().toISOString(),
            }
          : r,
      ),
    )
    setSahkanId(null)
    setToast({ type: 'success', message: 'Laporan disahkan.' })
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Laporan Diterima</h2>
            {!loading && <p className="text-xs text-neutral-400">{rowsTapis.length} laporan</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tapisNegeri}
              onChange={(e) => setTapisNegeri(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            >
              <option value="">Semua negeri</option>
              {NEGERI_LIST.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={handleJanaPdf}
              disabled={menjanaPdf || rowsTapis.length === 0}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              <FileDown size={15} />
              {menjanaPdf ? 'Menjana...' : 'Jana PDF'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
                <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-neutral-200" />
                <div className="space-y-1.5">
                  <span className="block h-3 w-40 animate-pulse rounded-full bg-neutral-200" />
                  <span className="block h-2.5 w-24 animate-pulse rounded-full bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        ) : rowsTapis.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Inbox size={28} className="text-neutral-300" />
            <p className="text-sm text-neutral-400">
              {tapisNegeri ? 'Tiada laporan untuk negeri ini.' : 'Tiada laporan diterima lagi.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {rowsTapis.map((row) => {
              const buka = terbuka === row.id
              const tajuk = row.nama_bencana || row.jenis_bencana || 'Laporan'
              const lokasi = [row.negeri, row.daerah].filter(Boolean).join(' · ')
              return (
                <div
                  key={row.id}
                  className={`rounded-xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-400 ${
                    fadingId === row.id ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <FileText size={18} />
                    </div>

                    <button
                      onClick={() => bukaTutup(row.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900">{tajuk}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                          {lokasi && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {lokasi}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock3 size={12} />
                            {new Date(row.created_at).toLocaleString('ms-MY')}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`ml-auto shrink-0 text-neutral-400 transition-transform ${buka ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {row.perhatian_nama ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={12} />
                        Disahkan
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          bukaSahkan(row)
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200"
                      >
                        <Clock3 size={12} />
                        Belum Disahkan
                      </button>
                    )}

                    <button
                      onClick={() => setPendingDelete(row)}
                      title="Padam"
                      className="shrink-0 rounded-lg border border-transparent p-2 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {buka && jenis === 'semasa' && (
                    <div className="space-y-3 border-t border-neutral-100 p-4">
                      <Bahagian tajuk="Maklumat Bencana" fields={[...SEMASA_MAKLUMAT_FIELDS, TARIKH_MASA_FIELD]} row={row} />

                      {row.trend && (
                        <Seksyen tajuk="Trend">
                          {(() => {
                            const t = TREND_LABEL[row.trend] ?? TREND_LABEL.kekal
                            const Ikon = row.trend === 'naik' ? TrendingUp : row.trend === 'turun' ? TrendingDown : Minus
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${t.className}`}>
                                <Ikon size={12} />
                                {t.label}
                              </span>
                            )
                          })()}
                        </Seksyen>
                      )}

                      <Seksyen tajuk="Ringkasan Laporan">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.ringkasan_status === 'ada_perubahan'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {row.ringkasan_status === 'ada_perubahan' ? 'Ada Perubahan' : 'Tiada Perubahan'}
                        </span>
                      </Seksyen>

                      {row.ringkasan_status === 'ada_perubahan' && (
                        <Seksyen tajuk="Pusat Pemindahan Sementara">
                          {loadingPps[row.id] ? (
                            <p className="text-xs text-neutral-400">Memuatkan...</p>
                          ) : (ppsMap[row.id]?.length ?? 0) === 0 ? (
                            <p className="text-xs text-neutral-400">Tiada rekod PPS.</p>
                          ) : (
                            <div className="space-y-2">
                              {ppsMap[row.id].map((p) => (
                                <div key={p.id} className="rounded-lg border border-white/60 bg-white/50 p-3 text-sm backdrop-blur-sm">
                                  <p className="whitespace-pre-wrap font-medium text-neutral-800">
                                    {p.pps} <span className="text-xs text-neutral-400">({p.zon})</span>
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                                    <MapPin size={12} />
                                    {p.negeri} · {p.daerah}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-600">
                                    Mangsa: {p.jumlah_mangsa ?? '—'} · Keluarga: {p.jumlah_keluarga ?? '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </Seksyen>
                      )}

                      <Bahagian tajuk="Hal-hal Lain" fields={[HAL_LAIN_FIELD]} row={row} />
                      <Bahagian tajuk="Disediakan Oleh" fields={SEMASA_PENYEDIA_FIELDS} row={row} />
                      {pengesahanBlok(row)}
                    </div>
                  )}

                  {buka && jenis === 'awal' && (
                    <div className="space-y-3 border-t border-neutral-100 p-4">
                      <Bahagian tajuk="Tarikh / Masa" fields={[TARIKH_MASA_FIELD]} row={row} />
                      <Bahagian tajuk="Maklumat Kejadian" fields={KEJADIAN_FIELDS} row={row} />
                      <Bahagian tajuk="Hal-hal Lain" fields={[HAL_LAIN_FIELD]} row={row} />
                      <Bahagian tajuk="Disediakan Oleh" fields={PENYEDIA_FIELDS} row={row} />
                      {pengesahanBlok(row)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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

      {sahkanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">Sahkan Laporan</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  value={sahkanNilai.nama}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, nama: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Jawatan</label>
                <input
                  value={sahkanNilai.jawatan}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, jawatan: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">No. Telefon</label>
                <input
                  value={sahkanNilai.telefon}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, telefon: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              {sahkanRalat && <p className="text-sm text-red-600">{sahkanRalat}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSahkanId(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                onClick={hantarSahkan}
                disabled={menyahkan}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menyahkan ? 'Menyahkan...' : 'Sahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
