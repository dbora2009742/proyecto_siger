import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  getZonasMacro,
  getSubzonas,
  crearZonaMacro,
  crearSubzona,
  editarSubzona,
  cambiarEstado,
  actualizarGeometriaMacro,
} from '../../../services/zonificacion.service'

const COLORES = ['#00b488', '#2563eb', '#d97706', '#dc2626', '#7c3aed']
const colorPorZona = (id) => COLORES[(id - 1) % COLORES.length]

/* ── Capas zonas macro ───────────────────────────────────── */
function CapasMacro({ zonasMacro, macroResaltada }) {
  const map = useMap()
  const layersRef = useRef({})

  useEffect(() => {
    Object.values(layersRef.current).forEach(l => l.remove())
    layersRef.current = {}
    zonasMacro.forEach((z) => {
      if (!z.geojson) return
      const color = colorPorZona(z.id_zona_macro)
      const esSel = macroResaltada === z.id_zona_macro
      const layer = L.geoJSON(z.geojson, {
        style: {
          color,
          fillColor: color,
          fillOpacity: esSel ? 0.13 : 0.04,
          weight: esSel ? 3 : 1.5,
          dashArray: '8,5',
        },
      })
        .bindTooltip(`<b>${z.codigo}</b> ${z.nombre}`, { sticky: true })
        .addTo(map)
      layersRef.current[z.id_zona_macro] = layer
    })
  }, [zonasMacro, macroResaltada, map])

  return null
}

/* ── Capas subzonas ──────────────────────────────────────── */
function CapasSubzonas({ subzonas, seleccionada, onSeleccionar }) {
  const map = useMap()
  const layersRef = useRef({})

  useEffect(() => {
    Object.values(layersRef.current).forEach(l => l.remove())
    layersRef.current = {}
    subzonas.forEach((s) => {
      if (!s.geojson) return
      const color = colorPorZona(s.id_zona_macro)
      const activa = s.estado === 'ACTIVA'
      const esSel  = seleccionada?.id_subzona === s.id_subzona
      const layer = L.geoJSON(s.geojson, {
        style: {
          color,
          fillColor: color,
          fillOpacity: esSel ? 0.38 : activa ? 0.18 : 0.06,
          weight: esSel ? 3 : 1.8,
          dashArray: activa ? null : '6,4',
        },
      })
        .bindTooltip(`<b>${s.codigo}</b><br/>${s.nombre}`, { sticky: true })
        .on('click', () => onSeleccionar(s))
        .addTo(map)
      layersRef.current[s.id_subzona] = layer
    })
  }, [subzonas, seleccionada, map, onSeleccionar])

  return null
}

/* ── Dibujador — puntos via estado React, cierre por botón ── */
function Dibujador({ activo, puntosActuales, onAgregarPunto, onCancelar }) {
  const map = useMap()
  const markersRef  = useRef([])
  const polylineRef = useRef(null)
  const activoRef   = useRef(false)

  // Sincronizar ref con prop para closures
  useEffect(() => { activoRef.current = activo }, [activo])

  // Redibujar marcadores y línea cada vez que cambian los puntos
  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    polylineRef.current?.remove()
    polylineRef.current = null

    if (!puntosActuales.length) return

    puntosActuales.forEach(([lat, lng]) => {
      const m = L.circleMarker([lat, lng], {
        radius: 5,
        color: '#00b488',
        fillColor: '#fff',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map)
      markersRef.current.push(m)
    })

    if (puntosActuales.length > 1) {
      // Cerrar visualmente la línea al último punto
      polylineRef.current = L.polyline(puntosActuales, {
        color: '#00b488',
        dashArray: '6,4',
        weight: 2,
      }).addTo(map)
    }
  }, [puntosActuales, map])

  // Cursor y limpieza al activar/desactivar
  useEffect(() => {
    if (activo) {
      map.getContainer().style.cursor = 'crosshair'
    } else {
      map.getContainer().style.cursor = ''
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      polylineRef.current?.remove()
      polylineRef.current = null
    }
  }, [activo, map])

  // Listener click nativo — solo agrega punto
  useEffect(() => {
    if (!activo) return

    const handleClick = (e) => {
      if (!activoRef.current) return
      onAgregarPunto([e.latlng.lat, e.latlng.lng])
    }

    const handleKey = (e) => {
      if (e.key === 'Escape' && activoRef.current) onCancelar()
    }

    map.on('click', handleClick)
    window.addEventListener('keydown', handleKey)

    return () => {
      map.off('click', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [activo, map, onAgregarPunto, onCancelar])

  return null
}

/* ── Helper: validar self-intersection ──────────────────── */
function tieneLineasCruzadas(coords) {
  const seg = (p1, p2, p3, p4) => {
    const d = (p2[0]-p1[0])*(p4[1]-p3[1]) - (p2[1]-p1[1])*(p4[0]-p3[0])
    if (d === 0) return false
    const t = ((p3[0]-p1[0])*(p4[1]-p3[1]) - (p3[1]-p1[1])*(p4[0]-p3[0])) / d
    const u = ((p3[0]-p1[0])*(p2[1]-p1[1]) - (p3[1]-p1[1])*(p2[0]-p1[0])) / d
    return t > 0 && t < 1 && u > 0 && u < 1
  }
  const n = coords.length
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (i === 0 && j === n - 2) continue
      if (seg(coords[i], coords[i+1], coords[j], coords[j+1])) return true
    }
  }
  return false
}

/* ══════════════════════════════════════════════════════════ */
export default function ZonificacionPage() {
  const [zonasMacro, setZonasMacro] = useState([])
  const [subzonas,   setSubzonas]   = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState('')
  const [mapaListo,  setMapaListo]  = useState(false)

  // Panel
  const [modoPanel,       setModoPanel]       = useState(false)
  const [tipoPanel,       setTipoPanel]       = useState(null)
  const [subzonaEditando, setSubzonaEditando] = useState(null)

  // Campos macro nueva
  const [macroNuevaCodigo, setMacroNuevaCodigo] = useState('')
  const [macroNuevaNombre, setMacroNuevaNombre] = useState('')
  const [macroNuevaDesc,   setMacroNuevaDesc]   = useState('')

  // Campos macro polígono
  const [macroSelecId, setMacroSelecId] = useState('')

  // Campos subzona
  const [subMacroId, setSubMacroId] = useState('')
  const [subCodigo,  setSubCodigo]  = useState('')
  const [subNombre,  setSubNombre]  = useState('')

  // Dibujo
  const [dibujando,      setDibujando]      = useState(false)
  const [puntosActuales, setPuntosActuales] = useState([])
  const [geojsonListo,   setGeojsonListo]   = useState(null)

  // Mapa
  const [seleccionada, setSeleccionada] = useState(null)

  // Panel
  const [errorPanel, setErrorPanel] = useState('')
  const [guardando,  setGuardando]  = useState(false)

  // Sub-modo macro
  const [subModoMacro, setSubModoMacro] = useState('nueva')

  /* ── Carga ── */
  const cargar = useCallback(async () => {
    try {
      const [zm, sz] = await Promise.all([getZonasMacro(), getSubzonas()])
      setZonasMacro(zm)
      setSubzonas(sz)
      setMapaListo(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  /* ── Dibujo: agregar punto ── */
  const agregarPunto = useCallback((punto) => {
    setPuntosActuales(prev => [...prev, punto])
  }, [])

  /* ── Dibujo: deshacer último punto ── */
  const deshacerPunto = useCallback(() => {
    setPuntosActuales(prev => prev.slice(0, -1))
  }, [])

  /* ── Dibujo: cerrar polígono desde botón ── */
  const cerrarPoligono = useCallback(() => {
    if (puntosActuales.length < 3) {
      setErrorPanel('Necesitas al menos 3 puntos para cerrar el polígono.')
      return
    }
    // Convertir [lat,lng] → [lng,lat] para GeoJSON
    const coords = puntosActuales.map(([lat, lng]) => [lng, lat])

    if (tieneLineasCruzadas(coords)) {
      setErrorPanel('El polígono tiene líneas cruzadas. Usa "Deshacer" para corregir o reinicia el dibujo.')
      return
    }

    const ring = [...coords, coords[0]] // cerrar anillo GeoJSON
    const geojson = { type: 'Polygon', coordinates: [ring] }

    setPuntosActuales([])
    setDibujando(false)
    setGeojsonListo(geojson)
    setErrorPanel('')
  }, [puntosActuales])

  /* ── Dibujo: cancelar ── */
  const cancelarDibujo = useCallback(() => {
    setPuntosActuales([])
    setDibujando(false)
  }, [])

  /* ── Iniciar dibujo ── */
  const iniciarDibujo = () => {
    setPuntosActuales([])
    setGeojsonListo(null)
    setDibujando(true)
    setErrorPanel('')
  }

  /* ── Abrir nuevo ── */
  const abrirNuevo = () => {
    setSubzonaEditando(null)
    setTipoPanel(null)
    setSubModoMacro('nueva')
    setMacroNuevaCodigo('')
    setMacroNuevaNombre('')
    setMacroNuevaDesc('')
    setMacroSelecId('')
    setSubMacroId('')
    setSubCodigo('')
    setSubNombre('')
    setGeojsonListo(null)
    setPuntosActuales([])
    setDibujando(false)
    setErrorPanel('')
    setModoPanel(true)
  }

  /* ── Abrir edición ── */
  const abrirEdicion = (s) => {
    setSubzonaEditando(s)
    setTipoPanel('subzona')
    setSubMacroId(String(s.id_zona_macro))
    setSubCodigo(s.codigo)
    setSubNombre(s.nombre)
    setGeojsonListo(null)
    setPuntosActuales([])
    setDibujando(false)
    setErrorPanel('')
    setSeleccionada(s)
    setModoPanel(true)
  }

  /* ── Cancelar panel ── */
  const cancelar = () => {
    setModoPanel(false)
    setTipoPanel(null)
    setSubzonaEditando(null)
    setMacroNuevaCodigo('')
    setMacroNuevaNombre('')
    setMacroNuevaDesc('')
    setMacroSelecId('')
    setSubMacroId('')
    setSubCodigo('')
    setSubNombre('')
    setGeojsonListo(null)
    setPuntosActuales([])
    setDibujando(false)
    setErrorPanel('')
  }

  /* ── Guardar macro nueva ── */
  const guardarMacraNueva = async () => {
    if (!macroNuevaCodigo.trim()) return setErrorPanel('El código es obligatorio.')
    if (!macroNuevaNombre.trim()) return setErrorPanel('El nombre es obligatorio.')
    setGuardando(true); setErrorPanel('')
    try {
      await crearZonaMacro({
        codigo:      macroNuevaCodigo.trim(),
        nombre:      macroNuevaNombre.trim(),
        descripcion: macroNuevaDesc.trim() || null,
      })
      cancelar(); cargar()
    } catch (e) {
      setErrorPanel(e.message)
    } finally {
      setGuardando(false)
    }
  }

  /* ── Guardar polígono macro ── */
  const guardarPoligonoMacro = async () => {
    if (!macroSelecId) return setErrorPanel('Selecciona una zona macro.')
    if (!geojsonListo) return setErrorPanel('Dibuja el polígono en el mapa.')
    setGuardando(true); setErrorPanel('')
    try {
      await actualizarGeometriaMacro(macroSelecId, geojsonListo)
      cancelar(); cargar()
    } catch (e) {
      setErrorPanel(e.message)
    } finally {
      setGuardando(false)
    }
  }

  /* ── Guardar subzona ── */
  const guardarSubzona = async () => {
    if (!subMacroId)       return setErrorPanel('Selecciona un sector.')
    if (!subCodigo.trim()) return setErrorPanel('El código es obligatorio.')
    if (!subNombre.trim()) return setErrorPanel('El nombre es obligatorio.')
    if (!geojsonListo)     return setErrorPanel('Debes dibujar y cerrar el polígono en el mapa.')
    if (geojsonListo.coordinates[0].length < 4)
      return setErrorPanel('El polígono necesita al menos 3 vértices.')

    setGuardando(true); setErrorPanel('')
    try {
      if (subzonaEditando) {
        await editarSubzona(subzonaEditando.id_subzona, {
          id_zona_macro: subMacroId,
          nombre:        subNombre.trim(),
          geojson:       geojsonListo,
        })
      } else {
        await crearSubzona({
          id_zona_macro: subMacroId,
          codigo:        subCodigo.trim(),
          nombre:        subNombre.trim(),
          geojson:       geojsonListo,
        })
      }
      cancelar(); cargar()
    } catch (e) {
      setErrorPanel(e.message)
    } finally {
      setGuardando(false)
    }
  }

  /* ── Dispatcher guardar ── */
  const guardar = () => {
    if (tipoPanel === 'macro') {
      subModoMacro === 'nueva' ? guardarMacraNueva() : guardarPoligonoMacro()
    } else {
      guardarSubzona()
    }
  }

  /* ── Toggle estado subzona ── */
  const toggleEstado = async (s) => {
    const nuevo = s.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA'
    try {
      await cambiarEstado(s.id_subzona, nuevo)
      cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const macroResaltada = subModoMacro === 'poligono' && macroSelecId
    ? Number(macroSelecId)
    : subMacroId
      ? Number(subMacroId)
      : null

  /* ── Bloque de controles de dibujo (reutilizable en panel) ── */
  const controlesdibujo = (
    <>
      {!dibujando && !geojsonListo && (
        <button
          onClick={iniciarDibujo}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border border-[#00b488] text-[#00b488] bg-white hover:bg-emerald-50 transition-colors"
        >
          🖊️ Iniciar dibujo en mapa
        </button>
      )}

      {dibujando && (
        <div className="flex flex-col gap-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-800">
            🖊️ <strong>Dibujando…</strong> Haz clic en el mapa para agregar vértices.
            <br />
            <span className="text-amber-600 font-bold">
              {puntosActuales.length} punto{puntosActuales.length !== 1 ? 's' : ''} agregado{puntosActuales.length !== 1 ? 's' : ''}
            </span>
            {puntosActuales.length >= 3 && (
              <span className="text-emerald-700 font-bold"> — listo para cerrar</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={deshacerPunto}
              disabled={puntosActuales.length === 0}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >↩ Deshacer</button>
            <button
              onClick={cerrarPoligono}
              disabled={puntosActuales.length < 3}
              className="flex-1 py-2 rounded-xl bg-[#00b488] text-white text-[11px] font-bold disabled:opacity-40 hover:bg-[#009e78] transition-colors"
            >✅ Cerrar polígono</button>
          </div>
          <button
            onClick={cancelarDibujo}
            className="py-2 rounded-xl border border-red-200 text-[11px] font-bold text-red-400 hover:bg-red-50 transition-colors"
          >✕ Cancelar dibujo</button>
        </div>
      )}

      {geojsonListo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-[11px] text-emerald-700 font-medium">
          ✅ Polígono listo ({geojsonListo.coordinates[0].length - 1} vértices)
          <button
            onClick={iniciarDibujo}
            className="ml-auto text-slate-400 hover:text-red-500 text-xs"
          >✕ Redibujar</button>
        </div>
      )}
    </>
  )

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-5 pt-1 px-6 pb-6 min-h-full bg-slate-100">

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                stroke="#00b488" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="12" cy="9" r="2.5" stroke="#00b488" strokeWidth="2"/>
              <path d="M7 20.5c0 0 1.5 1.5 5 1.5s5-1.5 5-1.5" stroke="#00b488" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide">ZONIFICACIÓN TERRITORIAL</h1>
            <p className="text-xs text-slate-500 mt-0.5">Gestión de zonas macro y subzonas con georreferenciación en mapa interactivo</p>
          </div>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 bg-[#00b488] hover:bg-[#009e78] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-colors"
        >
          <span className="text-lg leading-none">+</span> Nueva Zona / Subzona
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
          <span className="font-bold">Error:</span> {error}
          <button onClick={() => setError('')} className="ml-auto underline">cerrar</button>
        </div>
      )}

      {/* Mapa + Panel */}
      <div className="flex gap-4" style={{ height: '480px' }}>

        {/* Mapa — siempre montado */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow border border-slate-200">
          <MapContainer
            center={[-12.5931, -69.1892]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            doubleClickZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            {mapaListo && (
              <>
                <CapasMacro zonasMacro={zonasMacro} macroResaltada={macroResaltada} />
                <CapasSubzonas
                  subzonas={subzonas}
                  seleccionada={seleccionada}
                  onSeleccionar={abrirEdicion}
                />
              </>
            )}
            <Dibujador
              activo={dibujando}
              puntosActuales={puntosActuales}
              onAgregarPunto={agregarPunto}
              onCancelar={cancelarDibujo}
            />
          </MapContainer>
        </div>

        {/* Panel lateral */}
        {modoPanel && (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow flex flex-col overflow-hidden">

            {/* Cabecera */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-sm font-extrabold text-slate-800">
                {subzonaEditando ? '✏️ Editar Subzona' : '➕ Nueva Zona / Subzona'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subzonaEditando ? 'Modifica los datos de la subzona.' : 'Elige qué tipo de zona vas a registrar.'}
              </p>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* Toggle tipo */}
              {!subzonaEditando && (
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <button
                    onClick={() => { setTipoPanel('macro'); setGeojsonListo(null); setPuntosActuales([]); setDibujando(false) }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                      tipoPanel === 'macro' ? 'bg-[#00b488] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >🗺️ Zona Macro</button>
                  <button
                    onClick={() => { setTipoPanel('subzona'); setGeojsonListo(null); setPuntosActuales([]); setDibujando(false) }}
                    className={`flex-1 py-2.5 text-xs font-bold border-l border-slate-200 transition-colors ${
                      tipoPanel === 'subzona' ? 'bg-[#00b488] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >📍 Subzona</button>
                </div>
              )}

              {/* ══ ZONA MACRO ══ */}
              {tipoPanel === 'macro' && !subzonaEditando && (
                <>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[11px]">
                    <button
                      onClick={() => { setSubModoMacro('nueva'); setGeojsonListo(null); setPuntosActuales([]); setDibujando(false) }}
                      className={`flex-1 py-2 font-bold transition-colors ${
                        subModoMacro === 'nueva' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >Crear nueva</button>
                    <button
                      onClick={() => { setSubModoMacro('poligono'); setGeojsonListo(null); setPuntosActuales([]); setDibujando(false) }}
                      className={`flex-1 py-2 font-bold border-l border-slate-200 transition-colors ${
                        subModoMacro === 'poligono' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >Dibujar polígono</button>
                  </div>

                  {subModoMacro === 'nueva' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código</label>
                        <input
                          value={macroNuevaCodigo}
                          onChange={e => setMacroNuevaCodigo(e.target.value.toUpperCase())}
                          placeholder="Ej. ZM-05"
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nombre</label>
                        <input
                          value={macroNuevaNombre}
                          onChange={e => setMacroNuevaNombre(e.target.value)}
                          placeholder="Nombre del sector"
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Descripción <span className="font-normal normal-case text-slate-400">(opcional)</span>
                        </label>
                        <textarea
                          value={macroNuevaDesc}
                          onChange={e => setMacroNuevaDesc(e.target.value)}
                          placeholder="Breve descripción del sector…"
                          rows={3}
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 resize-none"
                        />
                      </div>
                    </>
                  )}

                  {subModoMacro === 'poligono' && (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-800">
                        <strong>Nota:</strong> Selecciona la zona macro y dibuja su límite en el mapa.
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Zona Macro</label>
                        <select
                          value={macroSelecId}
                          onChange={e => { setMacroSelecId(e.target.value); setGeojsonListo(null); setPuntosActuales([]) }}
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40"
                        >
                          <option value="">Selecciona una zona macro…</option>
                          {zonasMacro.map(z => (
                            <option key={z.id_zona_macro} value={z.id_zona_macro}>
                              {z.codigo} — {z.nombre}{z.geojson ? ' ✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {macroSelecId && controlesdibujo}
                    </>
                  )}
                </>
              )}

              {/* ══ SUBZONA ══ */}
              {(tipoPanel === 'subzona' || subzonaEditando) && (
                <>
                  <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 text-[11px] text-sky-800">
                    <strong>Obligatorio:</strong> dibuja el polígono en el mapa. Debe quedar <strong>dentro</strong> de la zona macro seleccionada.
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sector (Zona Macro)</label>
                    <select
                      value={subMacroId}
                      onChange={e => { setSubMacroId(e.target.value); setGeojsonListo(null); setPuntosActuales([]) }}
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40"
                    >
                      <option value="">Selecciona un sector…</option>
                      {zonasMacro.map(z => (
                        <option key={z.id_zona_macro} value={z.id_zona_macro}>
                          {z.codigo} — {z.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código</label>
                    <input
                      value={subCodigo}
                      onChange={e => setSubCodigo(e.target.value.toUpperCase())}
                      disabled={!!subzonaEditando}
                      placeholder="Ej. SZ-01"
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nombre</label>
                    <input
                      value={subNombre}
                      onChange={e => setSubNombre(e.target.value)}
                      placeholder="Nombre descriptivo"
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b488]/40"
                    />
                  </div>

                  {controlesdibujo}
                </>
              )}

              {/* Error panel */}
              {errorPanel && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[11px] text-red-700 font-medium">
                  ⚠️ {errorPanel}
                </div>
              )}
            </div>

            {/* Botones footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                onClick={cancelar}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={guardar}
                disabled={guardando || !tipoPanel || dibujando}
                className="flex-1 py-2.5 rounded-xl bg-[#00b488] hover:bg-[#009e78] text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 px-1">
        {zonasMacro.map((z, i) => (
          <span key={z.id_zona_macro} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: COLORES[i % COLORES.length] }}/>
            {z.codigo} — {z.nombre}
            {z.geojson
              ? <span className="text-emerald-500 font-bold ml-1">✓</span>
              : <span className="text-slate-300 ml-1">sin polígono</span>}
          </span>
        ))}
      </div>

      {/* Tabla subzonas */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
            Subzonas registradas ({subzonas.length})
          </span>
        </div>
        <div className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_1.2fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {['CÓDIGO','NOMBRE','SECTOR','ÁREA (ha)','VÉRTICES','ESTADO','ACCIONES'].map(h => (
            <span key={h} className="text-[10.5px] font-bold text-slate-400 tracking-wide">{h}</span>
          ))}
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando subzonas…</div>
        ) : subzonas.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No hay subzonas registradas aún.</div>
        ) : (
          subzonas.map((s, i) => (
            <div
              key={s.id_subzona}
              className={`grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_1.2fr] gap-4 px-6 py-4 items-center border-b border-slate-50 transition-colors ${
                s.estado !== 'ACTIVA' ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
              }`}
            >
              <span className="font-mono text-xs font-bold text-slate-700">{s.codigo}</span>
              <span className="text-xs text-slate-700">{s.nombre}</span>
              <span className="text-xs text-slate-500">{s.zona_macro_codigo} — {s.zona_macro_nombre}</span>
              <span className="text-xs text-slate-500">{s.area_ha ?? '—'}</span>
              <span className="text-xs text-slate-500">{s.num_vertices ?? '—'}</span>
              <span className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold w-fit ${
                s.estado === 'ACTIVA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>{s.estado}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirEdicion(s)}
                  className="text-[10.5px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition-colors"
                >✏️ Editar</button>
                <button
                  onClick={() => toggleEstado(s)}
                  className={`text-[10.5px] font-semibold rounded-lg px-2.5 py-1 border transition-colors ${
                    s.estado === 'ACTIVA'
                      ? 'border-red-200 text-red-500 hover:bg-red-50'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >{s.estado === 'ACTIVA' ? 'Desactivar' : 'Activar'}</button>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border-t border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"/>
          <p className="text-[10.5px] text-emerald-800 font-medium">
            <strong>Tip:</strong> Haz clic sobre un polígono en el mapa para editarlo.{' '}
            Usa el botón <strong>"Cerrar polígono"</strong> del panel para finalizar el dibujo.{' '}
            <kbd className="bg-white border border-emerald-200 rounded px-1">Esc</kbd> cancela el dibujo.
          </p>
        </div>
      </div>

    </div>
  )
}
