import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Map, Trash2, Truck,
  Route, Scale, ClipboardList, BarChart2, BookOpen, LogOut
} from 'lucide-react'
import logo from '../../assets/logo.png'

const menu = [
  { label: 'Dashboard',            icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Usuarios y Permisos',  icon: Users,           path: '/usuarios' },
  { label: 'Zonificación',         icon: Map,             path: '/zonificacion' },
  { label: 'Mobiliario Urbano',    icon: Trash2,          path: '/mobiliario' },
  { label: 'Recursos Operativos',  icon: Truck,           path: '/flota' },
  { label: 'Rutas y Equipos',      icon: Route,           path: '/rutas' },
  { label: 'Pesajes',              icon: Scale,           path: '/pesajes' },
  { label: 'Fiscalización',        icon: ClipboardList,   path: '/fiscalizacion' },
  { label: 'Reportes',             icon: BarChart2,       path: '/reportes' },
  { label: 'Aula Virtual',         icon: BookOpen,        path: '/educacion' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-56 flex flex-col z-50"
      style={{ backgroundColor: '#0d1f2d' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center py-6 gap-1 border-b border-white/10">
        <img src={logo} alt="SIGER" className="w-14 object-contain" />
        <span className="text-white font-bold text-lg tracking-widest"></span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {menu.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-green-400' : 'text-white/50'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="px-3 py-5 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 w-full"
        >
          <LogOut size={17} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
