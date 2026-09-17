import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ROLE_LABEL } from '../lib/roles'
import { CreateUserModal } from '../components/CreateUserModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../hooks/useAuth'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  role: UserRole
  created_at: string
}

export function Admin() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProfileRow | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const muatSemula = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as ProfileRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  async function handleRoleChange(userId: string, role: UserRole) {
    setUpdatingId(userId)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    setUpdatingId(null)
    if (!error) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    }
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
      const body = await error.context?.json?.().catch(() => null)
      setDeleteError(body?.error ?? error.message)
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
            <span className="font-medium text-emerald-700">Admin</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Pengurusan Pengguna</h1>
          <p className="text-xs text-neutral-500">Cipta dan urus akaun pengguna</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800"
        >
          <Plus size={16} />
          Tambah Pengguna
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/60 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Emel</th>
              <th className="px-5 py-3 font-medium">Peranan</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-neutral-400">
                  Memuatkan...
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-white/40 transition-all duration-300 last:border-0 ${
                    fadingId === user.id ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <td className="px-5 py-3 text-neutral-800">{user.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{user.email ?? '—'}</td>
                  <td className="px-5 py-3">
                    {user.id === profile?.id ? (
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
                  <td className="px-5 py-3 text-right">
                    {user.id !== profile?.id && (
                      <button
                        onClick={() => setPendingDelete(user)}
                        disabled={updatingId === user.id}
                        title="Padam pengguna"
                        className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          muatSemula()
        }}
      />

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