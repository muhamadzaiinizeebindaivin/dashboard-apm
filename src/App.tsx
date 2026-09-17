import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { Layout } from './components/Layout'
import { HomeScreen } from './pages/HomeScreen'
import { Sumbangan } from './pages/Sumbangan'
import { LaporanAwam } from './pages/LaporanAwam'
import { SenaraiNgo } from './pages/SenaraiNgo'
import { SenaraiNgoNegeri } from './pages/SenaraiNgoNegeri'
import { Bencana } from './pages/Bencana'
import { Sekretariat } from './pages/Sekretariat'
import { LaporanAwal } from './pages/LaporanAwal'
import { LaporanSemasa } from './pages/LaporanSemasa'
import { Logistik } from './pages/Logistik'
import { SenaraiSumbangan } from './pages/SenaraiSumbangan'
import { SenaraiSumbanganNegeri } from './pages/SenaraiSumbanganNegeri'
import { Admin } from './pages/Admin'
import { SetPassword } from './pages/SetPassword'

// Lazy-loaded: these three pull in Leaflet/react-leaflet, which is a large
// dependency — only download it when someone actually visits a map page,
// instead of bundling it into every page load.
const Paras = lazy(() => import('./pages/Paras').then((m) => ({ default: m.Paras })))
const ParasJejak = lazy(() => import('./pages/ParasJejak').then((m) => ({ default: m.ParasJejak })))
const SenaraiParas = lazy(() => import('./pages/SenaraiParas').then((m) => ({ default: m.SenaraiParas })))

function Memuatkan() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
      Memuatkan...
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Memuatkan />}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/sumbangan" element={<Sumbangan />} />
            <Route path="/paras" element={<Paras />} />
            <Route path="/paras/jejak/:negeri" element={<ParasJejak />} />
            <Route path="/laporan" element={<LaporanAwam />} />
            <Route path="/set-password" element={<SetPassword />} />

            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="sekretariat" element={<Sekretariat />}>
                  <Route path="laporan-awal" element={<LaporanAwal />} />
                  <Route path="laporan-semasa" element={<LaporanSemasa />} />
                </Route>
                <Route path="logistik" element={<Logistik />} />

                {/* Super Admin only — Admin (pkon) has no access to these */}
                <Route element={<RequireRole allow={['pkop']} />}>
                  <Route path="ngo" element={<SenaraiNgo />} />
                  <Route path="ngo/:negeri" element={<SenaraiNgoNegeri />} />
                  <Route path="bencana" element={<Bencana />} />
                  <Route path="senarai-sumbangan" element={<SenaraiSumbangan />} />
                  <Route path="senarai-sumbangan/:negeri" element={<SenaraiSumbanganNegeri />} />
                  <Route path="senarai-paras" element={<SenaraiParas />} />
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App