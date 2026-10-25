import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronRight, ChevronLeft, Trash2, Check, X, Loader2, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { ROLE_LABEL } from '../lib/roles'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import type { StatusAkaun, UserRole } from '../hooks/useAuth'
import { SkeletonBarisJadual } from '../components/Memuatkan'
import { SENARAI_KUMPULAN_NEGERI } from '../lib/kumpulanNegeri'
import { KodAksesSection } from '../components/KodAksesSection'

// Accounts are created by self-registration (/daftar) only. Here the Super Admin
// approves or rejects new registrations and manages existing accounts.

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  jawatan_unit: string | null
  role: UserRole | null
  status: StatusAkaun
  catatan_kelulusan: string | null
  emel_disahkan_pada: string | null // null = verification link not clicked yet
  negeri: string | null // PKON only: the state (or Wilayah Persekutuan) they can see
  created_at: string
}

const tarikhMasa = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function LencanaStatus({ status }: { status: StatusAkaun }) {
  const gaya: Record<StatusAkaun, [string, string]> = {
    aktif: ['Aktif', 'bg-emerald-100 text-emerald-800'],
    ditolak: ['Ditolak', 'bg-red-100 text-red-700'],
    menunggu_kelulusan: ['Menunggu', 'bg-amber-100 text-amber-800'],
  }
  const [label, kelas] = gaya[status]
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${kelas}`}>{label}</span>
}

// ---------------------------------------------------------------------------
// Approve (choose the role) / reject (optional reason)
// ---------------------------------------------------------------------------
type Keputusan = { pengguna: ProfileRow; jenis: 'lulus' | 'tolak' }

function KeputusanModal({ keputusan, onClose, onSelesai }: { keputusan: Keputusan; onClose: () => void; onSelesai: (mesej: string) => void }) {
  const { pengguna, jenis } = keputusan
  const [peranan, setPeranan] = useState<UserRole>('pkon')
  const [negeri, setNegeri] = useState(pengguna.negeri ?? '')
  const [catatan, setCatatan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')
  const lulus = jenis === 'lulus'

  async function sahkan() {
    // An Admin (PKON) only sees one state: it must be chosen
    if (lulus && peranan === 'pkon' && !negeri) {
      setRalat('Sila pilih negeri bagi Admin (PKON).')
      return
    }
    setMenyimpan(true)
    setRalat('')
    const { error } = await supabase.rpc('putuskan_permohonan', {
      p_id: pengguna.id,
      p_keputusan: jenis,
      p_role: lulus ? peranan : null,
      p_catatan: lulus ? null : catatan.trim() || null,
      p_negeri: lulus && peranan === 'pkon' ? negeri : null,
    })
    setMenyimpan(false)
    if (error) {
      setRalat(error.code === '42501' ? 'Anda tiada kebenaran untuk tindakan ini.' : 'Gagal menyimpan keputusan. Sila cuba lagi.')
      return
    }
    onSelesai(
      lulus
        ? `${pengguna.full_name ?? pengguna.email} diluluskan sebagai ${ROLE_LABEL[peranan] ?? peranan}.`
        : `Permohonan ${pengguna.full_name ?? pengguna.email} ditolak.`,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-neutral-900">{lulus ? 'Luluskan Permohonan' : 'Tolak Permohonan'}</h2>
        <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
          <p className="font-medium text-neutral-800">{pengguna.full_name ?? '—'}</p>
          <p className="text-neutral-500">{pengguna.email}</p>
          {pengguna.jawatan_unit && <p className="text-neutral-500">{pengguna.jawatan_unit}</p>}
        </div>

        {lulus ? (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Peranan</label>
            <select
              value={peranan}
              onChange={(e) => setPeranan(e.target.value as UserRole)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
            >
              <option value="pkon">Admin (PKON)</option>
              <option value="pkop">Super Admin (PKOP)</option>
            </select>
            {peranan === 'pkon' ? (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Negeri <span className="text-red-500">*</span>
                </label>
                <select
                  value={negeri}
                  onChange={(e) => setNegeri(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">— Pilih negeri —</option>
                  {SENARAI_KUMPULAN_NEGERI.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-400">Admin hanya boleh melihat data negeri ini.</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-neutral-400">Super Admin boleh melihat semua negeri.</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Sebab (pilihan)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="cth. Bukan kakitangan Bahagian Pengurusan Bencana Operasi"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <p className="mt-1 text-xs text-neutral-400">Sebab ini dipaparkan kepada pemohon apabila log masuk.</p>
          </div>
        )}

        {ralat && <p className="mt-3 text-sm text-red-600">{ralat}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Batal
          </button>
          <button
            onClick={sahkan}
            disabled={menyimpan}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              lulus ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {menyimpan && <Loader2 size={15} className="animate-spin" />}
            {lulus ? 'Luluskan' : 'Tolak'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Error message sent back by an Edge Function ({ error: "..." }), or a generic one
async function mesejFungsi(error: { message: string; context?: { json?: () => Promise<unknown> } }) {
  const body = (await error.context?.json?.().catch(() => null)) as { error?: string } | null
  return body?.error ?? error.message
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function Admin() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [keputusan, setKeputusan] = useState<Keputusan | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProfileRow | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const muatSemula = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, jawatan_unit, role, status, catatan_kelulusan, emel_disahkan_pada, negeri, created_at')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) {
      setToast({ type: 'error', message: 'Gagal memuatkan senarai pengguna. Semak sambungan internet anda.' })
      return
    }
    setUsers((data as ProfileRow[]) ?? [])
  }, [])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])
  // New registrations appear without refreshing
  useRealtime('admin-pengguna', ['profiles'], muatSemula)

  const permohonan = users.filter((u) => u.status === 'menunggu_kelulusan')
  const akaun = users.filter((u) => u.status !== 'menunggu_kelulusan')

  // Pagination of the account list
  const SAIZ_HALAMAN = 10
  const [halaman, setHalaman] = useState(1)
  const jumlahHalaman = Math.max(1, Math.ceil(akaun.length / SAIZ_HALAMAN))
  const halamanSemasa = Math.min(halaman, jumlahHalaman) // e.g. after deleting the last row of the last page
  const akaunHalaman = akaun.slice((halamanSemasa - 1) * SAIZ_HALAMAN, halamanSemasa * SAIZ_HALAMAN)

  async function handleRoleChange(userId: string, role: UserRole) {
    setUpdatingId(userId)
    // .select() returns the updated row: an empty result means RLS refused it silently
    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select('id')
    setUpdatingId(null)
    if (error || !data || data.length === 0) {
      setToast({ type: 'error', message: 'Gagal menukar peranan. Anda mungkin tiada kebenaran untuk tindakan ini.' })
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    setToast({ type: 'success', message: 'Peranan dikemas kini.' })
  }

  async function handleNegeriChange(userId: string, negeri: string) {
    if (!negeri) return
    setUpdatingId(userId)
    const { data, error } = await supabase.from('profiles').update({ negeri }).eq('id', userId).select('id')
    setUpdatingId(null)
    if (error || !data || data.length === 0) {
      setToast({ type: 'error', message: 'Gagal menukar negeri. Anda mungkin tiada kebenaran untuk tindakan ini.' })
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, negeri } : u)))
    setToast({ type: 'success', message: `Negeri dikemas kini: ${negeri}.` })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const user = pendingDelete
    setDeleteError('')
    setUpdatingId(user.id)

    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: user.id },
    })
    setUpdatingId(null)

    if (error) {
      setDeleteError(await mesejFungsi(error))
      return
    }

    setPendingDelete(null)
    setToast({ type: 'success', message: 'Pengguna berjaya dipadam.' })

    setFadingId(user.id)
    setTimeout(() => {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setFadingId(null)
    }, 300)
  }

  return (
    <div>
      <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-emerald-700"
          >
            <Home size={13} />
            Portal
          </button>
          <ChevronRight size={13} className="text-neutral-300" />
          <span className="font-medium text-emerald-700">Admin</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Pengurusan Pengguna</h1>
        <p className="text-xs text-neutral-500">
          Pengguna mendaftar sendiri melalui pautan "Daftar" di halaman log masuk. Luluskan atau tolak permohonan di sini.
        </p>
      </div>

      {/* New registrations */}
      {permohonan.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-lg backdrop-blur-md">
          <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <UserPlus size={17} className="text-amber-600" />
            Permohonan Baharu
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{permohonan.length}</span>
          </h2>
          <div className="mt-3 divide-y divide-amber-200/70">
            {permohonan.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
                    {u.full_name ?? '—'}
                    {u.emel_disahkan_pada ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        E-mel disahkan
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                        E-mel belum disahkan
                      </span>
                    )}
                  </p>
                  <p className="break-all text-sm text-neutral-600">{u.email}</p>
                  <p className="text-xs text-neutral-500">
                    {u.jawatan_unit ?? 'Jawatan tidak dinyatakan'} · Didaftarkan {tarikhMasa(u.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setKeputusan({ pengguna: u, jenis: 'lulus' })}
                    // An unverified account can't log in anyway: approve it once the e-mail is confirmed
                    disabled={!u.emel_disahkan_pada}
                    title={u.emel_disahkan_pada ? undefined : 'Pengguna perlu mengesahkan e-mel dahulu'}
                    className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check size={15} />
                    Lulus
                  </button>
                  <button
                    onClick={() => setKeputusan({ pengguna: u, jenis: 'tolak' })}
                    className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <X size={15} />
                    Tolak
                  </button>
                  <button
                    onClick={() => setPendingDelete(u)}
                    disabled={updatingId === u.id}
                    title="Padam permohonan ini (cth. pendaftaran palsu atau e-mel tersalah)"
                    className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <KodAksesSection />

      {/* Accounts */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/60 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Emel</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">Jawatan / Unit</th>
              <th className="px-5 py-3 font-medium">Peranan</th>
              <th className="px-5 py-3 font-medium">Negeri</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonBarisJadual baris={5} lajur={7} />
            ) : (
              akaunHalaman.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-white/40 transition-all duration-300 last:border-0 ${
                    fadingId === user.id ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <td className="px-3 py-3 text-neutral-800 sm:px-5">
                    {user.full_name ?? '—'}
                    {/* Mobile: email (and status on small screens) under the name */}
                    <p className="break-all text-xs text-neutral-500 sm:hidden">{user.email ?? '—'}</p>
                    <div className="mt-1 md:hidden">
                      <LencanaStatus status={user.status} />
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-neutral-600 sm:table-cell">{user.email ?? '—'}</td>
                  <td className="hidden px-5 py-3 text-neutral-600 lg:table-cell">{user.jawatan_unit ?? '—'}</td>
                  <td className="px-5 py-3">
                    {user.status !== 'aktif' || !user.role ? (
                      <span className="text-xs text-neutral-400">—</span>
                    ) : user.id === profile?.id ? (
                      <span
                        title="Anda tidak boleh menukar peranan anda sendiri — minta Super Admin lain buat perubahan ini"
                        className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600"
                      >
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 outline-none focus:border-emerald-500 disabled:opacity-60"
                      >
                        <option value="pkon">Admin (PKON)</option>
                        <option value="pkop">Super Admin (PKOP)</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {user.status === 'aktif' && user.role === 'pkon' ? (
                      <select
                        value={user.negeri ?? ''}
                        disabled={updatingId === user.id}
                        onChange={(e) => handleNegeriChange(user.id, e.target.value)}
                        className={`rounded-full border bg-white px-2.5 py-1 text-xs font-medium outline-none focus:border-emerald-500 disabled:opacity-60 ${
                          user.negeri ? 'border-neutral-200 text-neutral-600' : 'border-amber-400 text-amber-700'
                        }`}
                      >
                        {/* A PKON without a state sees nothing until one is chosen */}
                        {!user.negeri && <option value="">— Pilih negeri —</option>}
                        {SENARAI_KUMPULAN_NEGERI.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    ) : user.status === 'aktif' && user.role === 'pkop' ? (
                      <span className="text-xs text-neutral-500">Semua negeri</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    <span title={user.status === 'ditolak' ? (user.catatan_kelulusan ?? undefined) : undefined}>
                      <LencanaStatus status={user.status} />
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                    {/* A rejected request can still be approved (e.g. rejected by mistake) */}
                    {user.status === 'ditolak' && (
                      <button
                        onClick={() => setKeputusan({ pengguna: user, jenis: 'lulus' })}
                        title="Luluskan permohonan yang ditolak"
                        className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        <Check size={14} />
                        <span className="hidden lg:inline">Luluskan</span>
                      </button>
                    )}
                    {user.id !== profile?.id && (
                      <button
                        onClick={() => setPendingDelete(user)}
                        disabled={updatingId === user.id}
                        title="Padam pengguna"
                        className="rounded-full p-2.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 sm:p-1.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {akaun.length > SAIZ_HALAMAN && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-neutral-500">
            {(halamanSemasa - 1) * SAIZ_HALAMAN + 1}–{Math.min(halamanSemasa * SAIZ_HALAMAN, akaun.length)} daripada{' '}
            {akaun.length} pengguna
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHalaman(halamanSemasa - 1)}
              disabled={halamanSemasa === 1}
              className="flex items-center gap-1 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Sebelum
            </button>
            <span className="text-xs font-medium text-neutral-500">
              Halaman {halamanSemasa} / {jumlahHalaman}
            </span>
            <button
              onClick={() => setHalaman(halamanSemasa + 1)}
              disabled={halamanSemasa === jumlahHalaman}
              className="flex items-center gap-1 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-400 disabled:opacity-40"
            >
              Seterusnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {keputusan && (
        <KeputusanModal
          keputusan={keputusan}
          onClose={() => setKeputusan(null)}
          onSelesai={(mesej) => {
            setKeputusan(null)
            setToast({ type: 'success', message: mesej })
            muatSemula()
          }}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Padam Pengguna"
        message={`Padam pengguna "${pendingDelete?.full_name ?? pendingDelete?.email}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={updatingId === pendingDelete?.id}
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