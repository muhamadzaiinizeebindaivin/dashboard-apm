import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, Home, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { TambahSumbanganModal } from '../components/TambahSumbanganModal'
import { SumbanganDetailModal } from '../components/SumbanganDetailModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { NEGERI_FLAG } from '../lib/negeriVisual'
import { supabase } from '../lib/supabase'
import { STATUS_LIST, STATUS_LABEL, STATUS_BADGE_CLASS } from '../lib/sumbanganStatus'
import type { SumbanganStatus } from '../lib/sumbanganStatus'

type SumbanganRow = {
  id: string
  jenis_kumpulan: string
  nama_kumpulan: string
  no_tel: string | null
  jenis_sumbangan: string
  lokasi_bantuan: string
  status: SumbanganStatus
  created_at: string
}

const JENIS_KUMPULAN_LIST = ['NGO', 'CDA', 'PERSATUAN', 'KELAB', 'PERSEKUTUAN']
const JENIS_SUMBANGAN_LIST = ['BAHAN MENTAH', 'PERKHIDMATAN']
const SAIZ_HALAMAN = 10

export function SenaraiSumbanganNegeri() {
  const navigate = useNavigate()
  const { negeri: negeriParam } = useParams<{ negeri: string }>()
  const negeri = decodeURIComponent(negeriParam ?? '')

  const [rows, setRows] = useState<SumbanganRow[]>([])
  const [loading, setLoading] = useState(true)
  const [carian, setCarian] = useState('')
  const [tapisJenisKumpulan, setTapisJenisKumpulan] = useState('')
  const [tapisJenisSumbangan, setTapisJenisSumbangan] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<SumbanganRow | null>(null)
  const [tapisStatus, setTapisStatus] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<SumbanganRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SumbanganRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sumbangan')
      .select(
        'id, jenis_kumpulan, nama_kumpulan, no_tel, jenis_sumbangan, lokasi_bantuan, status, created_at',
      )
      .eq('negeri', negeri)
      .order('created_at', { ascending: false })

    setRows((data as SumbanganRow[]) ?? [])
    setLoading(false)
  }, [negeri])

  async function handleStatusChange(row: SumbanganRow, status: SumbanganStatus) {
    setUpdatingId(row.id)
    const { error } = await supabase.from('sumbangan').update({ status }).eq('id', row.id)
    setUpdatingId(null)
    if (!error) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)))
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleteError('')
    setDeleting(true)

    const { error } = await supabase.from('sumbangan').delete().eq('id', pendingDelete.id)
    setDeleting(false)

    if (error) {
      setDeleteError('Gagal memadam. Sila cuba lagi.')
      return
    }

    const id = pendingDelete.id
    setPendingDelete(null)
    setToast({ type: 'success', message: 'Sumbangan berjaya dipadam.' })

    // Fade the row out before actually removing it from the list, instead
    // of having it just vanish the instant the delete succeeds.
    setFadingId(id)
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => r.id !== id))
      setFadingId(null)
    }, 300)
  }

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  useEffect(() => {
    setHalaman(1)
  }, [carian, tapisJenisKumpulan, tapisJenisSumbangan, tapisStatus])

  const rowsTertapis = rows.filter((row) => {
    const carianRendah = carian.trim().toLowerCase()
    const cocokCarian =
      carianRendah === '' ||
      row.nama_kumpulan.toLowerCase().includes(carianRendah) ||
      (row.no_tel ?? '').toLowerCase().includes(carianRendah)
    const cocokJenisKumpulan = tapisJenisKumpulan === '' || row.jenis_kumpulan === tapisJenisKumpulan
    const cocokJenisSumbangan = tapisJenisSumbangan === '' || row.jenis_sumbangan === tapisJenisSumbangan
    const cocokStatus = tapisStatus === '' || row.status === tapisStatus
    return cocokCarian && cocokJenisKumpulan && cocokJenisSumbangan && cocokStatus
  })

  const jumlahHalaman = Math.max(1, Math.ceil(rowsTertapis.length / SAIZ_HALAMAN))
  const rowsHalamanIni = rowsTertapis.slice((halaman - 1) * SAIZ_HALAMAN, halaman * SAIZ_HALAMAN)

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={NEGERI_FLAG[negeri]} alt={negeri} className="h-10 w-14 rounded object-contain" />
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
                onClick={() => navigate('/senarai-sumbangan')}
                className="text-neutral-400 transition-colors hover:text-emerald-700"
              >
                Sumbangan
              </button>
              <ChevronRight size={13} className="text-neutral-300" />
              <span className="font-medium text-emerald-700">{negeri}</span>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">{negeri}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={16} />
            Tambah
          </motion.button>
          <button
            onClick={() => navigate('/senarai-sumbangan')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            placeholder="Cari nama kumpulan atau no. tel..."
            className="w-full rounded-full border border-white/60 bg-white/60 py-2.5 pl-9 pr-4 text-sm text-neutral-900 outline-none backdrop-blur-md focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Jenis Kumpulan:</span>
          <button
            onClick={() => setTapisJenisKumpulan('')}
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
              tapisJenisKumpulan === ''
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
            }`}
          >
            Semua
          </button>
          {JENIS_KUMPULAN_LIST.map((j) => (
            <button
              key={j}
              onClick={() => setTapisJenisKumpulan(tapisJenisKumpulan === j ? '' : j)}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisJenisKumpulan === j
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              {j}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Jenis Sumbangan:</span>
          <button
            onClick={() => setTapisJenisSumbangan('')}
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
              tapisJenisSumbangan === ''
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
            }`}
          >
            Semua
          </button>
          {JENIS_SUMBANGAN_LIST.map((j) => (
            <button
              key={j}
              onClick={() => setTapisJenisSumbangan(tapisJenisSumbangan === j ? '' : j)}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisJenisSumbangan === j
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              {j}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Status:</span>
          <button
            onClick={() => setTapisStatus('')}
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
              tapisStatus === ''
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
            }`}
          >
            Semua
          </button>
          {STATUS_LIST.map((s) => (
            <button
              key={s}
              onClick={() => setTapisStatus(tapisStatus === s ? '' : s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisStatus === s
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <DashboardCard className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-neutral-400">Memuatkan...</p>
        ) : rowsTertapis.length === 0 ? (
          <p className="text-sm text-neutral-500">Tiada sumbangan sepadan.</p>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400">
                  <th className="pb-2 pr-4 font-medium">Jenis Kumpulan</th>
                  <th className="pb-2 pr-4 font-medium">Nama Kumpulan</th>
                  <th className="pb-2 pr-4 font-medium">No. Tel</th>
                  <th className="pb-2 pr-4 font-medium">Jenis Sumbangan</th>
                  <th className="pb-2 pr-4 font-medium">Lokasi Bantuan</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Tarikh</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rowsHalamanIni.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className={`cursor-pointer border-b border-neutral-100 transition-all duration-300 last:border-0 hover:bg-emerald-50/60 ${
                      fadingId === row.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <td className="py-2 pr-4 text-neutral-800">{row.jenis_kumpulan}</td>
                    <td className="py-2 pr-4 text-neutral-800">{row.nama_kumpulan}</td>
                    <td className="py-2 pr-4 text-neutral-600">{row.no_tel ?? '—'}</td>
                    <td className="py-2 pr-4 text-neutral-600">{row.jenis_sumbangan}</td>
                    <td className="py-2 pr-4 text-neutral-600">{row.lokasi_bantuan}</td>
                    <td className="py-2 pr-4">
                      <select
                        value={row.status}
                        disabled={updatingId === row.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleStatusChange(row, e.target.value as SumbanganStatus)
                        }
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none disabled:opacity-60 ${STATUS_BADGE_CLASS[row.status]}`}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4 text-neutral-400">
                      {new Date(row.created_at).toLocaleDateString('ms-MY')}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingRow(row)
                          }}
                          title="Kemas kini"
                          className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-emerald-700"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingDelete(row)
                          }}
                          title="Padam"
                          className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {jumlahHalaman > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  disabled={halaman === 1}
                  className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Sebelum
                </button>
                <span className="text-xs font-medium text-neutral-500">
                  Halaman {halaman} / {jumlahHalaman}
                </span>
                <button
                  onClick={() => setHalaman((h) => Math.min(jumlahHalaman, h + 1))}
                  disabled={halaman === jumlahHalaman}
                  className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
                >
                  Seterusnya
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </DashboardCard>

      <TambahSumbanganModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          muatSemula()
        }}
        negeriTetap={negeri}
      />

      <TambahSumbanganModal
        open={!!editingRow}
        onClose={() => setEditingRow(null)}
        onSuccess={() => {
          setEditingRow(null)
          muatSemula()
        }}
        negeriTetap={negeri}
        existing={editingRow ?? undefined}
      />

      <SumbanganDetailModal
        open={!!selectedRow}
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title="Padam Sumbangan"
        message={`Padam sumbangan daripada "${pendingDelete?.nama_kumpulan}"? Tindakan ini tidak boleh dibatalkan.`}
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
