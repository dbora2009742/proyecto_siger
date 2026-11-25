import { UserCircle2 } from 'lucide-react'

export default function Topbar() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const rolLabel = {
    ADMIN_FISCALIZADOR: 'Administrador',
    RESPONSABLE_RUTA:   'Responsable de Ruta',
    OPERADOR_BALANZA:   'Operador de Balanza',
  }

  return (
    <header
      className="fixed top-0 left-56 right-0 h-14 flex items-center justify-end px-6 z-40 border-b border-white/5"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700 leading-tight">
            {usuario.nombres_apellidos || 'Usuario'}
          </p>
          <p className="text-xs text-gray-400">
            {rolLabel[usuario.rol] || usuario.rol}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: '#22c55e' }}
        >
          {(usuario.nombres_apellidos || 'U').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
