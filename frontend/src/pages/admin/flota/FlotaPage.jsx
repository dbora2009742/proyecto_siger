import { useEffect, useState } from 'react'
import {
  listarVehiculos,
  resumenFlota,
  crearVehiculo,
  editarVehiculo,
  cambiarEstadoVehiculo
} from '../../../services/flota.service'

// ── Constantes ──────────────────────────────────────────────
const TIPOS = ['Compactador', 'Baranda', 'Motofurgón']

const ESTADOS = [
  { value: 'DISPONIBLE',      label: 'Disponible',      color: 'bg-emerald-100 text-emerald-700' },
  { value: 'EN_SERVICIO',     label: 'En Servicio',     color: 'bg-blue-100 text-blue-700'       },
  { value: 'EN_MANTENIMIENTO',label: 'Mantenimiento',   color: 'bg-amber-100 text-amber-700'     },
  { value: 'BAJA',            label: 'Baja',            color: 'bg-red-100 text-red-700'         },
]

const FORM_VACIO = {
  placa: '', codigo_interno: '', tipo_vehiculo: '',
  capacidad_m3: '', tara_kg: '', estado_vehiculo: 'DISPONIBLE', kilometraje_actual: 0
}

const getBadge = (valor) => {
  const e = ESTADOS.find(e => e.value === valor)
  return e
    ? <span className={`px-3 py-1 rounded-full text-xs font-bold ${e.color}`}>{e.label}</span>
    : <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">{valor}</span>
}

// ── Componente principal ─────────────────────────────────────
export default function FlotaPage() {
  const [vehiculos, setVehiculos]   = useState([])
  const [resumen,   setResumen]     = useState(null)
  const [cargando,  setCargando]    = useState(true)
  const [filtros,   setFiltros]     = useState({ tipo: '', estado: '', buscar: '' })
  const [modal,     setModal]       = useState({ abierto: false, modo: 'crear', vehiculo: null })
  const [modalEstado, setModalEstado] = useState({ abierto: false, vehiculo: null })
  const [error,     setError]       = useState('')

  // ── Carga ──
  const cargar = async () => {
    setCargando(true)
    const [lista, res] = await Promise.all([
      listarVehiculos(filtros),
      resumenFlota()
    ])
    if (lista.ok)  setVehiculos(lista.data)
    if (res.ok)    setResumen(res.data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [filtros])

  // ── Modal crear/editar ──
  const abrirCrear = () =>
    setModal({ abierto: true, modo: 'crear', vehiculo: { ...FORM_VACIO } })

  const abrirEditar = (v) =>
    setModal({ abierto: true, modo: 'editar', vehiculo: { ...v } })

  const cerrarModal = () => { setModal({ abierto: false, modo: 'crear', vehiculo: null }); setError('') }

  const guardar = async () => {
    setError('')
    const v = modal.vehiculo
    if (!v.placa || !v.tipo_vehiculo || !v.capacidad_m3 || !v.tara_kg) {
      setError('Completa todos los campos obligatorios'); return
    }
    const res = modal.modo === 'crear'
      ? await crearVehiculo(v)
      : await editarVehiculo(v.id_vehiculo, v)

    if (!res.ok) { setError(res.mensaje ?? 'Error al guardar'); return }
    cerrarModal(); cargar()
  }

  // ── Modal estado ──
  const abrirEstado = (v) => setModalEstado({ abierto: true, vehiculo: v })
  const cerrarEstado = () => setModalEstado({ abierto: false, vehiculo: null })

  const aplicarEstado = async (nuevoEstado) => {
    const res = await cambiarEstadoVehiculo(modalEstado.vehiculo.id_vehiculo, nuevoEstado)
    if (res.ok) { cerrarEstado(); cargar() }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pt-1 px-6 pb-6 min-h-full">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-6 py-4 flex items-center justify-between" style={{ filter: 'drop-shadow(0 1px 2px #0000000f)' }}>
        <div className="flex items-center gap-4">
          <div className="bg-teal-100 rounded-xl p-3">
            <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M3 11l2-5h14l2 5M3 11v5a1 1 0 001 1h1m12 0h1a1 1 0 001-1v-5M3 11h18" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="16.5" cy="17.5" r="1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-wide uppercase">
              Gestión de Flota Vehicular
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de vehículos recolectores, peso tara y estado operativo
            </p>
          </div>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-colors"
          style={{ backgroundColor: '#00b488' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#009e78'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#00b488'}
        >
          <span className="text-lg leading-none">+</span> Registrar Vehículo
        </button>
      </div>

      {/* ── TARJETAS RESUMEN ── */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',         valor: resumen.total,            color: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400'    },
            { label: 'Disponibles',   valor: resumen.disponibles,      color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500'  },
            { label: 'En Servicio',   valor: resumen.en_servicio,      color: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500'     },
            { label: 'Mantenimiento', valor: resumen.en_mantenimiento, color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500'    },
          ].map(({ label, valor, color, dot }) => (
            <div key={label} className={`rounded-xl px-4 py-3 flex items-center gap-3 border border-slate-200 bg-white shadow-sm`}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
              <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className={`text-2xl font-extrabold ${color.split(' ')[1]}`}>{valor ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTROS ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</span>

        <select
          value={filtros.tipo}
          onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filtros.estado}
          onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>

        <input
          type="text"
          placeholder="🔍 Buscar placa o código..."
          value={filtros.buscar}
          onChange={e => setFiltros(f => ({ ...f, buscar: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 min-w-[220px]"
        />

        {(filtros.tipo || filtros.estado || filtros.buscar) && (
          <button
            onClick={() => setFiltros({ tipo: '', estado: '', buscar: '' })}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── TABLA ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Placa', 'Cód. Interno', 'Tipo de Unidad', 'Capacidad', 'Tara (kg)', 'Kilometraje', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Cargando vehículos...</td>
              </tr>
            ) : vehiculos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No se encontraron vehículos</td>
              </tr>
            ) : vehiculos.map((v, idx) => (
              <tr key={v.id_vehiculo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-4 py-3 font-bold text-slate-800">{v.placa}</td>
                <td className="px-4 py-3 text-slate-600">{v.codigo_interno ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{v.tipo_vehiculo}</td>
                <td className="px-4 py-3 text-slate-600">{v.capacidad_m3} m³</td>
                <td className="px-4 py-3 text-slate-600">{Number(v.tara_kg).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-600">{Number(v.kilometraje_actual).toLocaleString()} km</td>
                <td className="px-4 py-3">{getBadge(v.estado_vehiculo)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirEditar(v)}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => abrirEstado(v)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      🔧 Estado
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer tabla */}
        <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            <span className="font-bold">Tara (kg):</span> dato oficial para cálculo en balanza ·
            Vehículos en <span className="font-semibold">Mantenimiento</span> quedan excluidos de nuevas programaciones (CU-PLA-01)
          </p>
        </div>
      </div>

      {/* ── MODAL CREAR / EDITAR ── */}
      {modal.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: '#0b132955' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Header modal */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#0b1329' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                  {modal.modo === 'crear' ? 'Registrar Vehículo' : 'Editar Vehículo'}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#1e2c4a', color: '#2dd4bf' }}>
                  CU-REC-01
                </span>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Body modal */}
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Placa + Código */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Placa <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Ej: ABC-123"
                    value={modal.vehiculo.placa}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, placa: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Código Interno</label>
                  <input
                    type="text"
                    placeholder="Ej: CMP-04"
                    value={modal.vehiculo.codigo_interno ?? ''}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, codigo_interno: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tipo de Unidad <span className="text-red-500">*</span></label>
                <select
                  value={modal.vehiculo.tipo_vehiculo}
                  onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, tipo_vehiculo: e.target.value } }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Capacidad + Tara */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Capacidad (m³) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 8"
                    value={modal.vehiculo.capacidad_m3}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, capacidad_m3: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Tara (kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 4200"
                    value={modal.vehiculo.tara_kg}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, tara_kg: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
              </div>

              {/* Kilometraje + Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Kilometraje actual</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 12500"
                    value={modal.vehiculo.kilometraje_actual}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, kilometraje_actual: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Estado inicial</label>
                  <select
                    value={modal.vehiculo.estado_vehiculo}
                    onChange={e => setModal(m => ({ ...m, vehiculo: { ...m.vehiculo, estado_vehiculo: e.target.value } }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    style={{ backgroundColor: '#ecfdf5', color: '#00b488', fontWeight: 600 }}
                  >
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Hint */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                ⚠ <span className="font-semibold">Tara (kg)</span> es obligatorio para el cálculo en balanza.
                Vehículos en <span className="font-semibold">Mantenimiento</span> se excluyen de programaciones automáticamente.
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={cerrarModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: '#00b488' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#009e78'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#00b488'}
              >
                💾 Guardar Vehículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CAMBIAR ESTADO ── */}
      {modalEstado.abierto && modalEstado.vehiculo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: '#0b132955' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#0b1329' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">Cambiar Estado</h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#1e2c4a', color: '#2dd4bf' }}>
                  {modalEstado.vehiculo.placa}
                </span>
              </div>
              <button onClick={cerrarEstado} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-xs text-slate-500 mb-1">Selecciona el nuevo estado operativo del vehículo:</p>
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => aplicarEstado(e.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all
                    ${modalEstado.vehiculo.estado_vehiculo === e.value
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${e.color.split(' ')[0].replace('bg-', 'bg-').replace('100', '500')}`} />
                  {e.label}
                  {modalEstado.vehiculo.estado_vehiculo === e.value && (
                    <span className="ml-auto text-xs text-teal-500 font-bold">actual</span>
                  )}
                </button>
              ))}
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={cerrarEstado}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}