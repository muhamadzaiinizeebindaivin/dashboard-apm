import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Home, KeyRound, Loader2, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ROLE_LABEL } from '../lib/roles'
import { SYARAT_KATA_LALUAN, kataLaluanKukuh } from '../lib/kataLaluan'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { Memuat, Skeleton } from '../components/Memuatkan'

// "Profil Saya": every approved user sees their own account, edits their name and
// position, and changes their password. Role, state and status are managed by PKOP in Admin.

type Profil = {
  full_name: string | null
  email: string | null
  jawatan_unit: string | null
  role: string | null
  negeri: string | null
  created_at: string
  diputuskan_pada: string | null
  diputuskan_oleh_nama: string | null
}

const kad = 'rounded-2xl border border-white/60 bg-white/50 p-5 shadow-lg backdrop-blur-md'
const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

const tarikh = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800">{nilai}</span>
    </div>
  )
}

export function ProfilSaya() {
  const navigate = useNavigate()
  const { muatSemulaProfil } = useAuth()
  const [profil, setProfil] = useState<Profil | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)

  // Editable details
  const [nama, setNama] = useState('')
  const [jawatan, setJawatan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  // Password
  const [semasa, setSemasa] = useState('')
  const [baru, setBaru] = useState('')
  const [sahkan, setSahkan] = useState('')
  const [ralatKata, setRalatKata] = useState('')
  const [menukarKata, setMenukarKata] = useState(false)

  const [sahLogKeluarSemua, setSahLogKeluarSemua] = useState(false)

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('profil_saya').maybeSingle()
    setMemuat(false)
    if (error || !data) {
      setToast({ type: 'error', message: 'Gagal memuatkan profil.' })
      return
    }
    const p = data as Profil
    setProfil(p)
    setNama(p.full_name ?? '')
    setJawatan(p.jawatan_unit ?? '')
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function simpanButiran() {
    if (!nama.trim()) {
      setToast({ type: 'error', message: 'Nama penuh diperlukan.' })
      return
    }
    setMenyimpan(true)
    const { error } = await supabase.rpc('kemaskini_profil_saya', { p_nama: nama.trim(), p_jawatan: jawatan.trim() })
    setMenyimpan(false)
    if (error) {
      setToast({ type: 'error', message: 'Gagal menyimpan butiran. Sila cuba lagi.' })
      return
    }
    setToast({ type: 'success', message: 'Butiran profil disimpan.' })
    await muatSemulaProfil() // the name shown elsewhere follows
    muat()
  }

  async function tukarKataLaluan() {
    setRalatKata('')
    if (!semasa) return setRalatKata('Sila masukkan kata laluan semasa.')
    if (!kataLaluanKukuh(baru)) return setRalatKata('Kata laluan baharu belum memenuhi semua syarat.')
    if (baru !== sahkan) return setRalatKata('Kata laluan baharu tidak sepadan.')
    if (baru === semasa) return setRalatKata('Kata laluan baharu mesti berbeza daripada kata laluan semasa.')
    if (!profil?.email) return setRalatKata('E-mel akaun tidak dijumpai.')

    setMenukarKata(true)
    // The current password is checked first (protects an unattended logged-in computer)
    const { error: salah } = await supabase.auth.signInWithPassword({ email: profil.email, password: semasa })
    if (salah) {
      setMenukarKata(false)
      setRalatKata('Kata laluan semasa salah.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: baru })
    setMenukarKata(false)
    if (error) {
      setRalatKata('Gagal menukar kata laluan. Sila cuba lagi.')
      return
    }
    setSemasa('')
    setBaru('')
    setSahkan('')
    setToast({ type: 'success', message: 'Kata laluan berjaya ditukar.' })
  }

  async function logKeluarSemua() {
    setSahLogKeluarSemua(false)
    // Ends every session of this account (phones, other computers…), this one included
    await supabase.auth.signOut({ scope: 'global' })
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
          <span className="font-medium text-emerald-700">Profil Saya</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Profil Saya</h1>
      </div>

      {memuat ? (
        <Memuat label="Memuatkan profil" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </Memuat>
      ) : !profil ? null : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Account (read-only) */}
          <section className={kad}>
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-neutral-900">
              <ShieldCheck size={17} className="text-emerald-700" />
              Maklumat Akaun
            </h2>
            <div className="divide-y divide-neutral-100">
              <Baris label="E-mel" nilai={profil.email ?? '—'} />
              <Baris label="Peranan" nilai={profil.role ? (ROLE_LABEL[profil.role] ?? profil.role) : '—'} />
              <Baris label="Negeri" nilai={profil.role === 'pkop' ? 'Semua negeri' : (profil.negeri ?? 'Belum ditetapkan')} />
              <Baris label="Status" nilai="Aktif" />
              <Baris label="Tarikh daftar" nilai={tarikh(profil.created_at)} />
              {profil.diputuskan_pada && (
                <Baris
                  label="Diluluskan"
                  nilai={`${tarikh(profil.diputuskan_pada)}${profil.diputuskan_oleh_nama ? ` oleh ${profil.diputuskan_oleh_nama}` : ''}`}
                />
              )}
            </div>
            <p className="mt-3 text-xs text-neutral-400">
              Peranan dan negeri hanya boleh ditukar oleh Super Admin.
            </p>
          </section>

          {/* Editable details */}
          <section className={kad}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
              <UserRound size={17} className="text-emerald-700" />
              Butiran Peribadi
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Nama Penuh</label>
                <input value={nama} onChange={(e) => setNama(e.target.value)} className={`${inputClass} uppercase`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Jawatan / Unit</label>
                <input value={jawatan} onChange={(e) => setJawatan(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={simpanButiran}
                disabled={menyimpan}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menyimpan ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Simpan
              </button>
            </div>
          </section>

          {/* Password */}
          <section className={kad}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
              <KeyRound size={17} className="text-emerald-700" />
              Tukar Kata Laluan
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Kata laluan semasa</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={semasa}
                  onChange={(e) => setSemasa(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Kata laluan baharu</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={baru}
                  onChange={(e) => setBaru(e.target.value)}
                  className={inputClass}
                />
                <ul className="mt-2 space-y-0.5 text-xs">
                  {SYARAT_KATA_LALUAN.map((s) => {
                    const ok = s.test(baru)
                    return (
                      <li key={s.label} className={ok ? 'text-emerald-600' : 'text-neutral-400'}>
                        {ok ? '✓' : '○'} {s.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Sahkan kata laluan baharu</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={sahkan}
                  onChange={(e) => setSahkan(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            {ralatKata && <p className="mt-3 text-sm text-red-600">{ralatKata}</p>}
            <div className="mt-4 flex justify-end">
              <button
                onClick={tukarKataLaluan}
                disabled={menukarKata}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menukarKata && <Loader2 size={15} className="animate-spin" />}
                Tukar Kata Laluan
              </button>
            </div>
          </section>

          {/* Sessions */}
          <section className={kad}>
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-neutral-900">
              <LogOut size={17} className="text-red-600" />
              Sesi Log Masuk
            </h2>
            <p className="text-sm text-neutral-600">
              Jika telefon atau komputer anda hilang, log keluar dari semua peranti. Anda perlu log masuk semula di
              semua tempat, termasuk di sini.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSahLogKeluarSemua(true)}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Log keluar dari semua peranti
              </button>
            </div>
          </section>
        </div>
      )}

      <ConfirmModal
        open={sahLogKeluarSemua}
        title="Log Keluar Semua Peranti"
        message="Semua sesi akaun ini akan ditamatkan, termasuk sesi ini. Teruskan?"
        confirmLabel="Log Keluar"
        danger
        onConfirm={logKeluarSemua}
        onCancel={() => setSahLogKeluarSemua(false)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}