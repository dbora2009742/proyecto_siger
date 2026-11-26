import { useEffect, useState } from 'react'
import {
  getEquipos,
  cambiarEstadoEquipo,
} from '../../../services/equipos.service'
import {
  getRutas,
  cambiarEstadoRuta,
} from '../../../services/rutas.service'
import ModalEquipo from './ModalEquipo'
import ModalRuta   from './ModalRuta'
import Swal from 'sweetalert2'

const TURNO_STYLE = {
  MANANA: { label: '🌅 Mañana', color: 'bg-amber-100 text-amber-700'   },
  TARDE:  { label: '🌤 Tarde',  color: 'bg-sky-100 text-sky-700'       },
  NOCHE:  { label: '🌙 Noche',  color: 'bg-violet-100 text-violet-700' },
}

export default function RutasPage() {
  const [tab, setTab]                   = useState('equipos')

  // Equipos
  const [equipos, setEquipos]           = useState([])
  const [loadingEq, setLoadingEq]       = useState(true)
  const [filtroEstadoEq, setFiltroEstadoEq] = useState('')
  const [buscarEq, setBuscarEq]         = useState('')
  const [modalEquipo, setModalEquipo]   = useState(false)
  const [equipoEdit, setEquipoEdit]     = useState(null)

  // Rutas
  const [rutas, setRutas]               = useState([])
  const [loadingRt, setLoadingRt]       = useState(true)
  const [filtroTurno, setFiltroTurno]   = useState('')
  const [filtroEstadoRt, setFiltroEstadoRt] = useState('')
  const [buscarRt, setBuscarRt]         = useState('')
  const [modalRuta, setModalRuta]       = useState(false)
  const [rutaEdit, setRutaEdit]         = useState(null)

  // ── Cargas ──────────────────────────────────────────
  const cargarEquipos = async () => {
    setLoadingEq(true)
    try {
      const params = {}
      if (filtroEstadoEq !== '') params.activo  = filtroEstadoEq
      if (buscarEq)               params.buscar = buscarEq
      const res = await getEquipos(params)
      setEquipos(res.data?.data ?? [])
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los equipos', 'error')
      setEquipos([])
    } finally {
      setLoadingEq(false)
    }
  }

  const cargarRutas = async () => {
    setLoadingRt(true)
    try {
      const params = {}
      if (filtroEstadoRt !== '') params.activa  = filtroEstadoRt
      if (filtroTurno)            params.turno  = filtroTurno
      if (buscarRt)               params.buscar = buscarRt
      const res = await getRutas(params)
      setRutas(res.data?.data ?? [])
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las rutas', 'error')
      setRutas([])
    } finally {
      setLoadingRt(false)
    }
  }

  useEffect(() => { cargarEquipos() }, [filtroEstadoEq, buscarEq])
  useEffect(() => { cargarRutas()   }, [filtroTurno, filtroEstadoRt, buscarRt])

  // ── Toggle estado equipo ─────────────────────────────
  const handleToggleEquipo = async (eq) => {
    const accion = eq.activo ? 'inhabilitar' : 'activar'
    const { isConfirmed } = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} equipo?`,
      text: eq.nombre,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: eq.activo ? '#ef4444' : '#00b488',
      cancelButtonText: 'Cancelar',
      confirmButtonText: eq.activo ? 'Sí, inhabilitar' : 'Sí, activar',
    })
    if (!isConfirmed) return
    try {
      await cambiarEstadoEquipo(eq.id_equipo, !eq.activo)
      await cargarEquipos()
      Swal.fire('Listo', `Equipo ${accion === 'inhabilitar' ? 'inhabilitado' : 'activado'}`, 'success')
    } catch {
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
    }
  }

  // ── Toggle estado ruta ───────────────────────────────
  const handleToggleRuta = async (rt) => {
    const accion = rt.activa ? 'desactivar' : 'activar'
    const { isConfirmed } = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} ruta?`,
      text: `${rt.codigo} — ${rt.nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: rt.activa ? '#ef4444' : '#00b488',
      cancelButtonText: 'Cancelar',
      confirmButtonText: rt.activa ? 'Sí, desactivar' : 'Sí, activar',
    })
    if (!isConfirmed) return
    try {
      await cambiarEstadoRuta(rt.id_ruta, !rt.activa)
      await cargarRutas()
      Swal.fire('Listo', `Ruta ${accion === 'desactivar' ? 'desactivada' : 'activada'}`, 'success')
    } catch {
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-1 px-6 pb-6 min-h-full bg-slate-100">

      {/* ── Header módulo ── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="6"  cy="8"  r="2.5" stroke="#00b488" strokeWidth="2"/>
              <circle cx="18" cy="16" r="2.5" stroke="#00b488" strokeWidth="2"/>
              <path d="M8.5 8h7a2 2 0 0 1 2 2v4" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
              <path d="M6 10.5v3" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide">
              RUTAS Y EQUIPOS DE TRABAJO
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de cuadrillas operativas y programación de rutas de recolección por turno y subzonas
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (tab === 'equipos') { setEquipoEdit(null); setModalEquipo(true) }
            else                   { setRutaEdit(null);   setModalRuta(true)   }
          }}
          className="flex items-center gap-2 bg-[#00b488] hover:bg-[#009e78] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {tab === 'equipos' ? 'Nuevo Equipo' : 'Nueva Ruta'}
        </button>
      </div>

      {/* ── Tabs + Filtros ── */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-wrap">

        {/* Tabs */}
        <button
          onClick={() => setTab('equipos')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'equipos'
              ? 'bg-emerald-50 border border-[#00b488] text-teal-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Equipos de Trabajo ({equipos.length})
        </button>
        <button
          onClick={() => setTab('rutas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'rutas'
              ? 'bg-emerald-50 border border-[#00b488] text-teal-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Rutas Programadas ({rutas.length})
        </button>

        <div className="w-px h-7 bg-slate-200 mx-1" />

        {/* Filtros Equipos */}
        {tab === 'equipos' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Estado:</span>
              <select
                value={filtroEstadoEq}
                onChange={e => setFiltroEstadoEq(e.target.value)}
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
                placeholder="🔍 Buscar cuadrilla, responsable o placa..."
                value={buscarEq}
                onChange={e => setBuscarEq(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
              />
            </div>
          </>
        )}

        {/* Filtros Rutas */}
        {tab === 'rutas' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Turno:</span>
              <select
                value={filtroTurno}
                onChange={e => setFiltroTurno(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
              >
                <option value="">Todos</option>
                <option value="MANANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Estado:</span>
              <select
                value={filtroEstadoRt}
                onChange={e => setFiltroEstadoRt(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
              >
                <option value="">Todos</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="🔍 Buscar ruta, código o equipo..."
                value={buscarRt}
                onChange={e => setBuscarRt(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
              />
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* TAB EQUIPOS                                   */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'equipos' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="grid grid-cols-[2fr_2fr_2fr_2fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            {['CUADRILLA / CÓDIGO', 'RESPONSABLE DE RUTA', 'VEHÍCULO ASIGNADO', 'INTEGRANTES', 'ESTADO', 'ACCIONES'].map(h => (
              <span key={h} className="text-[10.5px] font-bold text-slate-400 tracking-wide">{h}</span>
            ))}
          </div>

          {loadingEq ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando equipos...</div>
          ) : equipos.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No se encontraron equipos</div>
          ) : (
            equipos.map((eq, i) => (
              <div
                key={eq.id_equipo}
                className={`grid grid-cols-[2fr_2fr_2fr_2fr_1fr_1fr] gap-4 px-6 py-4 items-center border-b border-slate-50 transition-colors ${
                  !eq.activo ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${eq.activo ? 'text-slate-900' : 'text-slate-400'}`}>
                    {eq.nombre}
                  </p>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">EQ-{String(eq.id_equipo).padStart(3,'0')}</p>
                </div>

                <div>
                  <p className={`text-sm ${eq.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {eq.responsable_nombre}
                  </p>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">DNI: {eq.responsable_dni}</p>
                </div>

                <div>
                  <p className={`text-sm font-semibold ${eq.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {eq.placa}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    {eq.tipo_vehiculo} · {eq.capacidad_m3}m³
                  </p>
                </div>

                <span className={`text-xs ${eq.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                  {eq.integrantes_detalle ?? '—'}
                </span>

                <button
                  onClick={() => handleToggleEquipo(eq)}
                  className="flex items-center gap-2"
                  title={eq.activo ? 'Inhabilitar equipo' : 'Activar equipo'}
                >
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${eq.activo ? 'bg-[#00b488]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${eq.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className={`text-xs font-semibold ${eq.activo ? 'text-emerald-600' : 'text-red-500'}`}>
                    {eq.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </button>

                <button
                  onClick={() => { setEquipoEdit(eq); setModalEquipo(true) }}
                  className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors w-fit"
                >
                  ✏️ Editar
                </button>
              </div>
            ))
          )}

          <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border-t border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10.5px] text-emerald-800 font-medium">
              <strong>Nota:</strong> Inhabilitar un equipo no elimina su historial operativo ni sus servicios registrados.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* TAB RUTAS                                     */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'rutas' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="grid grid-cols-[1.2fr_2fr_1.2fr_1.5fr_2fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            {['CÓDIGO', 'NOMBRE DE RUTA', 'TURNO', 'DÍAS', 'EQUIPO / VEHÍCULO', 'ESTADO', 'ACCIONES'].map(h => (
              <span key={h} className="text-[10.5px] font-bold text-slate-400 tracking-wide">{h}</span>
            ))}
          </div>

          {loadingRt ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando rutas...</div>
          ) : rutas.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No se encontraron rutas</div>
          ) : (
            rutas.map((rt, i) => {
              const turno = TURNO_STYLE[rt.turno] ?? { label: rt.turno, color: 'bg-slate-100 text-slate-600' }
              return (
                <div
                  key={rt.id_ruta}
                  className={`grid grid-cols-[1.2fr_2fr_1.2fr_1.5fr_2fr_1fr_1fr] gap-4 px-6 py-4 items-center border-b border-slate-50 transition-colors ${
                    !rt.activa ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <span className={`text-xs font-mono font-bold ${rt.activa ? 'text-slate-800' : 'text-slate-400'}`}>
                    {rt.codigo}
                  </span>

                  <div>
                    <p className={`text-sm font-bold ${rt.activa ? 'text-slate-900' : 'text-slate-400'}`}>
                      {rt.nombre}
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      {rt.total_subzonas} subzona{rt.total_subzonas !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <span className={`inline-block px-3 py-1 rounded-full text-[10.5px] font-bold w-fit ${turno.color}`}>
                    {turno.label}
                  </span>

                  <span className="text-xs text-slate-600">
                    {rt.dias_semana?.split(',').map(d => d.trim().slice(0,3)).join(' · ')}
                  </span>

                  <div>
                    <p className={`text-sm ${rt.activa ? 'text-slate-800' : 'text-slate-400'}`}>
                      {rt.equipo_nombre}
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      {rt.placa} · {rt.tipo_vehiculo}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleRuta(rt)}
                    className="flex items-center gap-2"
                    title={rt.activa ? 'Desactivar ruta' : 'Activar ruta'}
                  >
                    <div className={`relative w-10 h-5 rounded-full transition-colors ${rt.activa ? 'bg-[#00b488]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rt.activa ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className={`text-xs font-semibold ${rt.activa ? 'text-emerald-600' : 'text-red-500'}`}>
                      {rt.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </button>

                  <button
                    onClick={() => { setRutaEdit(rt); setModalRuta(true) }}
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
              <strong>Nota:</strong> Desactivar una ruta no cancela los servicios diarios ya programados.
            </p>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {modalEquipo && (
        <ModalEquipo
          equipo={equipoEdit}
          onClose={() => { setModalEquipo(false); setEquipoEdit(null) }}
          onGuardado={() => { setModalEquipo(false); setEquipoEdit(null); cargarEquipos() }}
        />
      )}

      {modalRuta && (
        <ModalRuta
          ruta={rutaEdit}
          onClose={() => { setModalRuta(false); setRutaEdit(null) }}
          onGuardado={() => { setModalRuta(false); setRutaEdit(null); cargarRutas() }}
        />
      )}
    </div>
  )
}
