import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { RequireAuth } from './components/RequireAuth'
import { Layout } from './components/Layout'
import { HomeScreen } from './pages/HomeScreen'
import { Sumbangan } from './pages/Sumbangan'
import { Paras } from './pages/Paras'
import { ParasJejak } from './pages/ParasJejak'
import { LaporanAwam } from './pages/LaporanAwam'
import { Ngo } from './pages/Ngo'
import { Bencana } from './pages/Bencana'
import { Sekretariat } from './pages/Sekretariat'
import { LaporanAwal } from './pages/LaporanAwal'
import { LaporanSemasa } from './pages/LaporanSemasa'
import { Logistik } from './pages/Logistik'
import { SenaraiSumbangan } from './pages/SenaraiSumbangan'
import { SenaraiParas } from './pages/SenaraiParas'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/sumbangan" element={<Sumbangan />} />
          <Route path="/paras" element={<Paras />} />
          <Route path="/paras/jejak/:negeri" element={<ParasJejak />} />
          <Route path="/laporan" element={<LaporanAwam />} />

          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="ngo" element={<Ngo />} />
              <Route path="bencana" element={<Bencana />} />
              <Route path="sekretariat" element={<Sekretariat />}>
                <Route path="laporan-awal" element={<LaporanAwal />} />
                <Route path="laporan-semasa" element={<LaporanSemasa />} />
              </Route>
              <Route path="logistik" element={<Logistik />} />
              <Route path="senarai-sumbangan" element={<SenaraiSumbangan />} />
              <Route path="senarai-paras" element={<SenaraiParas />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
