import { useState } from 'react'
import { Clock, XCircle, RefreshCw, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import apmLogo from '../assets/apm-logo.png'

// Shown instead of the dashboard to an account that registered but isn't approved
// (or was rejected). The account can log in, but sees nothing else.
export function StatusAkaun() {
  const { profile, signOut, muatSemulaProfil } = useAuth()
  const [menyemak, setMenyemak] = useState(false)
  const ditolak = profile?.status === 'ditolak'
  const tiadaProfil = !profile // account deleted, or its profile was never created

  async function semakSemula() {
    setMenyemak(true)
    await muatSemulaProfil()
    setMenyemak(false)
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/60 p-8 text-center shadow-2xl backdrop-blur-xl">
        <img src={apmLogo} alt="Logo APM" className="mx-auto h-16 w-16 object-contain" />

        <div
          className={`mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full ${
            ditolak || tiadaProfil ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {ditolak || tiadaProfil ? <XCircle size={24} /> : <Clock size={24} />}
        </div>

        <h1 className="mt-4 text-lg font-semibold text-neutral-900">
          {tiadaProfil ? 'Profil Tidak Dijumpai' : ditolak ? 'Permohonan Akaun Ditolak' : 'Menunggu Kelulusan'}
        </h1>

        {tiadaProfil ? (
          <p className="mt-2 text-sm text-neutral-600">
            Akaun ini tiada profil dalam sistem (mungkin telah dipadam). Sila log keluar dan hubungi Super Admin.
          </p>
        ) : ditolak ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              Maaf, permohonan akaun anda tidak diluluskan oleh Super Admin.
            </p>
            {profile?.catatan_kelulusan && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-700">
                <span className="font-medium">Sebab:</span> {profile.catatan_kelulusan}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            Terima kasih{profile?.full_name ? `, ${profile.full_name}` : ''}. Akaun anda telah didaftarkan dan sedang
            menunggu kelulusan Super Admin. Anda boleh menggunakan sistem sebaik sahaja diluluskan.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {!ditolak && !tiadaProfil && (
            <button
              onClick={semakSemula}
              disabled={menyemak}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {menyemak ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Semak Status
            </button>
          )}
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <LogOut size={15} />
            Log Keluar
          </button>
        </div>
      </div>
    </div>
  )
}