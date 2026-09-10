import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Ngo } from './pages/Ngo'
import { Bencana } from './pages/Bencana'
import { Sekretariat } from './pages/Sekretariat'
import { LaporanAwal } from './pages/LaporanAwal'
import { LaporanSemasa } from './pages/LaporanSemasa'
import { Logistik } from './pages/Logistik'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/bencana" replace />} />
          <Route path="ngo" element={<Ngo />} />
          <Route path="bencana" element={<Bencana />} />
          <Route path="sekretariat" element={<Sekretariat />}>
            <Route path="laporan-awal" element={<LaporanAwal />} />
            <Route path="laporan-semasa" element={<LaporanSemasa />} />
          </Route>
          <Route path="logistik" element={<Logistik />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
