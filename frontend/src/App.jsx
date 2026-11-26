import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import MainLayout from './components/layout/MainLayout'
import UsuariosPage from './pages/admin/usuarios/UsuariosPage'
import ZonificacionPage from './pages/admin/catastro/ZonificacionPage'
import MobiliarioPage from './pages/admin/MobiliarioPage'
import FlotaPage from './pages/admin/flota/FlotaPage'
import RutasPage from './pages/admin/rutas/RutasPage'


const Placeholder = ({ titulo }) => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-400 text-lg font-medium">{titulo} — próximamente</p>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard"     element={<Placeholder titulo="Dashboard" />} />
          <Route path="/usuarios"      element={<UsuariosPage />} />
          <Route path="/zonificacion"  element={<ZonificacionPage />} />
          <Route path="/mobiliario"    element={<MobiliarioPage />} />
          <Route path="/flota"         element={<FlotaPage />} />
          <Route path="/rutas"         element={<RutasPage />} />
          <Route path="/pesajes"       element={<Placeholder titulo="Pesajes" />} />
          <Route path="/fiscalizacion" element={<Placeholder titulo="Fiscalización" />} />
          <Route path="/reportes"      element={<Placeholder titulo="Reportes" />} />
          <Route path="/educacion"     element={<Placeholder titulo="Aula Virtual" />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
