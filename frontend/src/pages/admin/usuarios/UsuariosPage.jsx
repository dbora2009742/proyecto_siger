import { useEffect, useState } from 'react'
import { getUsuarios, cambiarEstado, getAuditoria } from '../../../services/usuarios.service'
import ModalUsuario from './ModalUsuario'
import TablaAuditoria from './TablaAuditoria'
import Swal from 'sweetalert2'

const ROLES_LABEL = {
  ADMIN_FISCALIZADOR: { label: 'Admin / Fiscalizador', color: 'bg-teal-100 text-teal-800' },
  RESPONSABLE_RUTA:   { label: 'Resp. de Ruta',        color: 'bg-violet-100 text-violet-800' },
  OPERADOR_BALANZA:   { label: 'Op. de Balanza',        color: 'bg-amber-100 text-amber-700' },
}

export default function UsuariosPage() {
  const [tab, setTab]                   = useState('usuarios')
  const [usuarios, setUsuarios]         = useState([])
  const [auditoria, setAuditoria]       = useState([])
  const [filtroRol, setFiltroRol]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar, setBuscar]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [usuarioEdit, setUsuarioEdit]   = useState(null)
  const [loading, setLoading]           = useState(true)

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroRol)    params.rol    = filtroRol
      if (filtroEstado) params.activo = filtroEstado
      if (buscar)       params.buscar = buscar
      const res = await getUsuarios(params)
      // backend devuelve { ok: true, data: [...] }
      const lista = res.data?.data ?? res.data?.usuarios ?? (Array.isArray(res.data) ? res.data : [])
      setUsuarios(lista)
    } catch (err) {
      console.error('❌ error cargarUsuarios:', err)
      setUsuarios([])
      Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  const cargarAuditoria = async () => {
    try {
      const res = await getAuditoria()
      const lista = res.data?.data ?? res.data?.auditoria ?? (Array.isArray(res.data) ? res.data : [])
      setAuditoria(lista)
    } catch {
      setAuditoria([])
    }
  }

  useEffect(() => { cargarUsuarios() }, [filtroRol, filtroEstado, buscar])
  useEffect(() => { cargarAuditoria() }, [])

  const handleToggleEstado = async (u) => {
    const accion = u.activo ? 'inhabilitar' : 'activar'
    const { isConfirmed } = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} cuenta?`,
      text: `${u.nombres_apellidos} — ${u.correo}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: u.activo ? '#ef4444' : '#00b488',
      cancelButtonText: 'Cancelar',
      confirmButtonText: u.activo ? 'Sí, inhabilitar' : 'Sí, activar',
    })
    if (!isConfirmed) return
    try {
      await cambiarEstado(u.id_usuario, !u.activo)
      await cargarUsuarios()
      await cargarAuditoria()
      Swal.fire('Listo', `Cuenta ${accion === 'inhabilitar' ? 'inhabilitada' : 'activada'} correctamente`, 'success')
    } catch {
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
    }
  }

  const handleGuardado = async () => {
    setModalOpen(false)
    setUsuarioEdit(null)
    await cargarUsuarios()
    await cargarAuditoria()
  }

  return (
    <div className="flex flex-col gap-5 pt-1 px-6 pb-6 min-h-full bg-slate-100">

      {/* ── Header del módulo ── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="4" stroke="#00b488" strokeWidth="2"/>
              <path d="M3 21c0-4 2.5-6 6-6s6 2 6 6" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 11l2 2 4-4" stroke="#00b488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide">
              GESTIÓN DE USUARIOS, ROLES Y AUDITORÍA
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de cuentas, control de roles operativos y trazabilidad de acciones del sistema
            </p>
          </div>
        </div>
        <button
          onClick={() => { setUsuarioEdit(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-[#00b488] hover:bg-[#009e78] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Nuevo Usuario
        </button>
      </div>

      {/* ── Tabs + Filtros ── */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-wrap">
        <button
          onClick={() => setTab('usuarios')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'usuarios'
              ? 'bg-emerald-50 border border-[#00b488] text-teal-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Cuentas de Usuario ({usuarios.length})
        </button>
        <button
          onClick={() => setTab('auditoria')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'auditoria'
              ? 'bg-emerald-50 border border-[#00b488] text-teal-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Historial de Auditoría
        </button>

        <div className="w-px h-7 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Rol:</span>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN_FISCALIZADOR">Admin / Fiscalizador</option>
            <option value="RESPONSABLE_RUTA">Responsable de Ruta</option>
            <option value="OPERADOR_BALANZA">Operador de Balanza</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, DNI o correo..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
          />
        </div>
      </div>

      {/* ── Tabla usuarios ── */}
      {tab === 'usuarios' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="grid grid-cols-[2fr_2.5fr_1.6fr_1.8fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            {['USUARIO / DNI', 'CORREO INSTITUCIONAL', 'ROL', 'LICENCIA / DATO ROL', 'ESTADO', 'ACCIONES'].map((h) => (
              <span key={h} className="text-[10.5px] font-bold text-slate-400 tracking-wide">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No se encontraron usuarios</div>
          ) : (
            usuarios.map((u, i) => {
              const rol = ROLES_LABEL[u.rol] ?? { label: u.rol, color: 'bg-slate-100 text-slate-600' }
              return (
                <div
                  key={u.id_usuario}
                  className={`grid grid-cols-[2fr_2.5fr_1.6fr_1.8fr_1fr_1fr] gap-4 px-6 py-4 items-center border-b border-slate-50 transition-colors ${
                    !u.activo ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${u.activo ? 'text-slate-900' : 'text-slate-400'}`}>
                      {u.nombres_apellidos}
                    </p>
                    <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">DNI: {u.dni}</p>
                  </div>

                  <span className={`text-xs ${u.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                    {u.correo}
                  </span>

                  <span className={`inline-block px-3 py-1 rounded-full text-[10.5px] font-bold w-fit ${rol.color}`}>
                    {rol.label}
                  </span>

                  <span className={`text-xs ${u.activo ? 'text-slate-700' : 'text-slate-400'}`}>
                    {u.rol === 'RESPONSABLE_RUTA' && u.licencia_categoria
                      ? `Lic. ${u.licencia_categoria} · ${u.licencia_numero ?? '—'}`
                      : u.rol === 'OPERADOR_BALANZA' && u.punto_asignado
                      ? u.punto_asignado
                      : '—'}
                  </span>

                  <button
                    onClick={() => handleToggleEstado(u)}
                    className="flex items-center gap-2"
                    title={u.activo ? 'Inhabilitar cuenta' : 'Activar cuenta'}
                  >
                    <div className={`relative w-10 h-5 rounded-full transition-colors ${u.activo ? 'bg-[#00b488]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${u.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className={`text-xs font-semibold ${u.activo ? 'text-emerald-600' : 'text-red-500'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </button>

                  <button
                    onClick={() => { setUsuarioEdit(u); setModalOpen(true) }}
                    className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors w-fit"
                  >
                    ✏️ Editar
                  </button>
                </div>
              )
            })
          )}

          <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border-t border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10.5px] text-emerald-800 font-medium">
              <strong>Seguridad:</strong> Inhabilitar una cuenta revoca el acceso de inmediato pero conserva todos sus registros operativos, rutas y tickets previos.
            </p>
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <TablaAuditoria registros={auditoria} />
      )}

      {modalOpen && (
        <ModalUsuario
          usuario={usuarioEdit}
          onClose={() => { setModalOpen(false); setUsuarioEdit(null) }}
          onGuardado={handleGuardado}
        />
      )}
    </div>
  )
}
