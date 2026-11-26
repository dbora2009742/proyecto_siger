import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { QRCodeSVG } from 'qrcode.react'
import { getTachos, crearTacho, editarTacho, darBajaTacho, getSubzonas } from '../../services/tachos.service'

/* ── fix íconos Leaflet con Vite ── */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ── colores e íconos ── */
const COLORES_TIPO = {
  ORGANICO:   '#16a34a',
  INORGANICO: '#2563eb',
  RECICLABLE: '#0891b2',
  PELIGROSO:  '#dc2626',
  GENERAL:    '#64748b',
}

const crearIconoTacho = (tipo, esNuevo = false) => {
  const color = esNuevo ? '#00b488' : (COLORES_TIPO[tipo] ?? '#64748b')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter>
      <path filter="url(#s)" fill="${color}" stroke="white" stroke-width="2"
        d="M16 2 C7 2 2 9 2 16 C2 26 16 40 16 40 C16 40 30 26 30 16 C30 9 25 2 16 2Z"/>
      <circle fill="white" cx="16" cy="16" r="7"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="800" fill="${color}">♻</text>
    </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44] })
}

/* ── labels ── */
const LABEL_TIPO = {
  ORGANICO: 'Orgánico / Aprovechable',
  INORGANICO: 'Inorgánico',
  RECICLABLE: 'Reciclable',
  PELIGROSO: 'Peligroso',
  GENERAL: 'General',
}
const LABEL_EST_OP = {
  OPERATIVO: 'Operativo',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
  EN_MANTENIMIENTO: 'En mantenimiento',
}
const LABEL_EST_FIS = { BUENO: 'Bueno', DETERIORADO: 'Deteriorado', DAÑADO: 'Dañado' }

/* ── capacidad por defecto según tipo (para el payload al backend) ── */
const CAP_DEFAULT = {
  ORGANICO: 1100, INORGANICO: 240, RECICLABLE: 240,
  PELIGROSO: 120, GENERAL: 240,
}

const QR_BASE_URL = 'https://siger.tambopata.gob.pe/reporte/'

/* ══════════════════════════════════════════════════════════
   Sub-componentes
══════════════════════════════════════════════════════════ */
function ZoomASubzona({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (!coords?.length) return
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
  }, [coords, map])
  return null
}

function CapturaClic({ modoCaptura, onClic }) {
  useMapEvents({ click(e) { if (modoCaptura) onClic(e.latlng) } })
  return null
}

function BotonGeolocalizacion({ onUbicar }) {
  const map = useMap()
  const handleClick = () => {
    if (!navigator.geolocation) return alert('Tu navegador no soporta geolocalización.')
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        map.setView([latitude, longitude], 18)
        onUbicar({ lat: latitude, lng: longitude })
      },
      () => alert('No se pudo obtener la ubicación. Verifica los permisos del navegador.')
    )
  }
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={handleClick}
          title="Ubicar mi posición actual"
          style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: 'none', cursor: 'pointer', fontSize: 18 }}
        >🎯</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function MobiliarioPage() {
  const [tachos,       setTachos]       = useState([])
  const [subzonas,     setSubzonas]     = useState([])
  const [subzonaSelId, setSubzonaSelId] = useState('')
  const [modoCaptura,  setModoCaptura]  = useState(false)
  const [pinPos,       setPinPos]       = useState(null)
  const [pinDentro,    setPinDentro]    = useState(null)
  const [form,         setForm]         = useState(null)
  const [editando,     setEditando]     = useState(null)
  const [cargando,     setCargando]     = useState(false)
  const [error,        setError]        = useState('')
  const [exito,        setExito]        = useState('')
  const [filtroBusq,   setFiltroBusq]   = useState('')
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [qrGuardado,   setQrGuardado]   = useState(null)   // { uuid, codigo_visible, tacho }
  const markerRef = useRef(null)

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    try {
      const [rT, rS] = await Promise.all([getTachos(), getSubzonas()])
      setTachos(rT.data)
      setSubzonas(rS.data)
    } catch (e) { setError(e.message) }
  }

  const subzonaActual = subzonas.find(s => String(s.id_subzona) === String(subzonaSelId))
  const coordsSubzona = subzonaActual?.geojson?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]) ?? []

  /* ── subzona detectada por el pin (búsqueda client-side para mostrar en form) ── */
  const subzonaDelPin = pinPos
    ? subzonas.find(s => {
        const coords = s.geojson?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]) ?? []
        if (!coords.length) return false
        return L.polygon(coords).getBounds().contains(L.latLng(pinPos.lat, pinPos.lng))
      })
    : null

  /* ── verificar si el pin cae dentro de alguna subzona ── */
  const verificarPinEnSubzona = useCallback((latlng) => {
    const dentro = subzonas.some(s => {
      const coords = s.geojson?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]) ?? []
      if (!coords.length) return false
      return L.polygon(coords).getBounds().contains(L.latLng(latlng.lat, latlng.lng))
    })
    setPinDentro(dentro)
    return dentro
  }, [subzonas])

  const formInicial = () => ({
    codigo_visible:       '',
    tipo_tacho:           'ORGANICO',
    estado_fisico:        'BUENO',
    estado_operativo:     'OPERATIVO',
    direccion_referencia: '',
  })

  /* ── clic en mapa ── */
  const handleClicMapa = useCallback((latlng) => {
    setPinPos({ lat: latlng.lat, lng: latlng.lng })
    verificarPinEnSubzona(latlng)
    setForm(f => f ?? formInicial())
    setEditando(null)
    setError('')
  }, [verificarPinEnSubzona])

  /* ── guardar ── */
  const handleGuardar = async () => {
    if (!form.codigo_visible.trim()) return setError('El código visible es obligatorio.')
    if (!pinPos && !editando)        return setError('Haz clic en el mapa para fijar la ubicación.')
    setCargando(true)
    setError('')
    try {
      const payload = {
        ...form,
        capacidad_litros: CAP_DEFAULT[form.tipo_tacho] ?? 240,
        ...(pinPos ? { lat: pinPos.lat, lng: pinPos.lng } : {}),
      }
      if (editando) {
        await editarTacho(editando, payload)
        setExito('Tacho actualizado correctamente.')
        setQrGuardado(null)
      } else {
        const res = await crearTacho(payload)
        setQrGuardado({ uuid: res.data?.codigo_qr, codigo_visible: form.codigo_visible })
        setExito('Tacho registrado y QR generado correctamente.')
      }
      setPinPos(null); setPinDentro(null); setForm(null)
      setEditando(null); setModoCaptura(false)
      await cargarDatos()
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  /* ── imprimir QR ── */
  const imprimirQR = (tacho) => {
    const url = `${QR_BASE_URL}${tacho.codigo_qr}`
    const win = window.open('', '_blank', 'width=620,height=720')
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>QR – ${tacho.codigo_visible}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;
         justify-content:center;min-height:100vh;background:#fff}
    .card{width:340px;border:2px solid #00b488;border-radius:16px;
          padding:28px 24px;text-align:center;
          box-shadow:0 4px 24px rgba(0,180,136,.15)}
    .logo{font-size:12px;font-weight:700;color:#00b488;letter-spacing:.05em;margin-bottom:2px}
    .municipio{font-size:10px;color:#64748b;margin-bottom:18px}
    .qr-wrap{background:#f0fdf4;border-radius:12px;padding:16px;
             display:inline-block;margin-bottom:18px}
    .qr-wrap img{width:180px;height:180px}
    .codigo{font-size:24px;font-weight:900;color:#0f172a;
            letter-spacing:.08em;margin-bottom:6px}
    .tipo{display:inline-block;background:#d1fae5;color:#065f46;
          font-size:11px;font-weight:700;padding:3px 12px;
          border-radius:999px;margin-bottom:16px}
    .datos{font-size:11px;color:#475569;line-height:1.9;text-align:left}
    .datos strong{color:#0f172a}
    .uuid{font-family:monospace;font-size:9px;color:#94a3b8;
          margin-top:16px;word-break:break-all}
    .footer{margin-top:14px;font-size:10px;color:#94a3b8}
    @media print{body{background:#fff}.card{box-shadow:none}@page{margin:10mm}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🌿 SIGER · MUNICIPALIDAD PROVINCIAL DE TAMBOPATA</div>
    <div class="municipio">Sistema de Gestión de Residuos Sólidos Municipales</div>
    <div class="qr-wrap">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&color=0f172a&bgcolor=f0fdf4&qzone=1" alt="QR"/>
    </div>
    <div class="codigo">${tacho.codigo_visible}</div>
    <div class="tipo">${LABEL_TIPO[tacho.tipo_tacho]}</div>
    <div class="datos">
      <p><strong>Subzona:</strong> ${tacho.subzona_codigo} – ${tacho.subzona_nombre}</p>
      <p><strong>Zona Macro:</strong> ${tacho.zona_macro_nombre ?? '—'}</p>
      <p><strong>Coordenadas:</strong> ${Number(tacho.lat).toFixed(6)}, ${Number(tacho.lng).toFixed(6)}</p>
      ${tacho.direccion_referencia ? `<p><strong>Referencia:</strong> ${tacho.direccion_referencia}</p>` : ''}
    </div>
    <div class="uuid">UUID: ${tacho.codigo_qr}</div>
    <div class="footer">Escanea para reportar incidencias · Puerto Maldonado, Madre de Dios</div>
  </div>
  <script>window.onload=()=>window.print()<\/script>
</body>
</html>`)
    win.document.close()
  }

  /* ── descargar QR PNG desde modal ── */
  const descargarQR = (uuid, codigoVisible) => {
    const svg = document.getElementById(`qr-modal-${uuid}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas  = document.createElement('canvas')
    canvas.width  = 200; canvas.height = 200
    const img = new Image()
    img.onload = () => {
      canvas.getContext('2d').drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = `QR-${codigoVisible}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  /* ── editar desde tabla ── */
  const abrirEdicion = (t) => {
    setEditando(t.id_tacho)
    setPinPos({ lat: t.lat, lng: t.lng })
    setPinDentro(true)
    setForm({
      codigo_visible:       t.codigo_visible,
      tipo_tacho:           t.tipo_tacho,
      estado_fisico:        t.estado_fisico,
      estado_operativo:     t.estado_operativo,
      direccion_referencia: t.direccion_referencia ?? '',
    })
    setModoCaptura(false)
    setError('')
    setSubzonaSelId(String(t.id_subzona))
  }

  /* ── baja ── */
  const handleBaja = async (id) => {
    if (!confirm('¿Dar de baja este tacho? Esta acción es irreversible.')) return
    try {
      await darBajaTacho(id)
      setExito('Tacho dado de baja.')
      await cargarDatos()
    } catch (e) { setError(e.message) }
  }

  /* ── tabla filtrada ── */
  const tachosFiltrados = tachos.filter(t => {
    const q = filtroBusq.toLowerCase()
    const matchBusq = !q ||
      t.codigo_visible.toLowerCase().includes(q) ||
      t.subzona_nombre?.toLowerCase().includes(q) ||
      t.direccion_referencia?.toLowerCase().includes(q)
    return matchBusq && (!filtroTipo || t.tipo_tacho === filtroTipo)
  })

  const badgeOp = (e) => {
    const cfg = { OPERATIVO: 'bg-emerald-100 text-emerald-700', FUERA_DE_SERVICIO: 'bg-red-100 text-red-700', EN_MANTENIMIENTO: 'bg-amber-100 text-amber-700' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[e] ?? ''}`}>{LABEL_EST_OP[e]}</span>
  }
  const badgeTipo = (t) => {
    const cfg = { ORGANICO: 'bg-green-100 text-green-700', INORGANICO: 'bg-blue-100 text-blue-700', RECICLABLE: 'bg-cyan-100 text-cyan-700', PELIGROSO: 'bg-red-100 text-red-700', GENERAL: 'bg-slate-100 text-slate-600' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[t] ?? ''}`}>{LABEL_TIPO[t]}</span>
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-100 px-6 pt-2 pb-1.2 space-y-6">

      {/* ── Encabezado ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-2xl">🗑️</div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Tachos y Mobiliario Georreferenciado</h1>
            <p className="text-sm text-slate-500">Fijación de coordenadas en vía pública · UUID automático · CU-CAT-02</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
            ● Activos: {tachos.length}
          </span>
          <button
            onClick={() => { setModoCaptura(true); setForm(null); setPinPos(null); setPinDentro(null); setError('') }}
            className="flex items-center gap-2 bg-[#00b488] hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <span className="text-lg leading-none">+</span> Registrar Tacho
          </button>
        </div>
      </div>

      {/* ── Alertas ── */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between"><span>⚠️ {error}</span><button onClick={() => setError('')}>✕</button></div>}
      {exito && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex justify-between"><span>✅ {exito}</span><button onClick={() => setExito('')}>✕</button></div>}

      {/* ── Modal QR post-guardado ── */}
      {qrGuardado && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-80">
            <div className="text-center">
              <p className="font-extrabold text-slate-800 text-base">✅ Tacho Registrado</p>
              <p className="text-xs text-slate-500 mt-1">Código QR institucional generado</p>
            </div>
            <div className="p-3 border-2 border-emerald-200 rounded-xl bg-emerald-50">
              <QRCodeSVG
                id={`qr-modal-${qrGuardado.uuid}`}
                value={`${QR_BASE_URL}${qrGuardado.uuid}`}
                size={160}
                fgColor="#0f172a"
                bgColor="#f0fdf4"
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="font-mono text-xs text-slate-400 text-center break-all">{qrGuardado.uuid}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => descargarQR(qrGuardado.uuid, qrGuardado.codigo_visible)}
                className="flex-1 bg-[#00b488] hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
              >⬇ Descargar QR</button>
              <button
                onClick={() => setQrGuardado(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm"
              >Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workspace: mapa + panel ── */}
      <div className="flex gap-5">

        {/* ── Mapa ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 480 }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ver subzona:</span>
            <select
              value={subzonaSelId}
              onChange={e => setSubzonaSelId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— Todas las subzonas —</option>
              {subzonas.map(s => (
                <option key={s.id_subzona} value={s.id_subzona}>{s.codigo} – {s.nombre}</option>
              ))}
            </select>
            {modoCaptura && !pinDentro && pinDentro !== false && (
              <span className="ml-auto flex items-center gap-2 bg-[#0b1329] text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>
                MODO CAPTURA — Haz clic en la acera o calle
              </span>
            )}
            {pinDentro === false && (
              <span className="ml-auto flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200">
                ⚠️ Fuera de los sectores habilitados
              </span>
            )}
          </div>

          <MapContainer
            center={[-12.5931, -69.1892]}
            zoom={14}
            style={{ height: 'calc(100% - 52px)', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />

            {coordsSubzona.length > 0 && <ZoomASubzona coords={coordsSubzona} />}

            {modoCaptura && (
              <BotonGeolocalizacion onUbicar={(latlng) => {
                setPinPos(latlng)
                verificarPinEnSubzona(latlng)
                setForm(f => f ?? formInicial())
              }} />
            )}

            {/* Polígonos de subzonas */}
            {subzonas.map(s => {
              const coords = s.geojson?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]) ?? []
              if (!coords.length) return null
              const esSel = String(s.id_subzona) === String(subzonaSelId)
              return (
                <Polygon key={s.id_subzona} positions={coords} pathOptions={{
                  color: esSel ? '#00b488' : '#94a3b8',
                  fillColor: esSel ? '#00b488' : '#94a3b8',
                  fillOpacity: esSel ? 0.08 : 0.03,
                  weight: esSel ? 2 : 1,
                  dashArray: esSel ? '6 4' : undefined,
                }} />
              )
            })}

            {/* Marcadores tachos existentes */}
            {tachos.map(t => (
              <Marker key={t.id_tacho} position={[t.lat, t.lng]} icon={crearIconoTacho(t.tipo_tacho)}>
                <Popup>
                  <div className="text-xs space-y-1 min-w-[160px]">
                    <p className="font-bold text-slate-800">{t.codigo_visible}</p>
                    <p className="text-slate-500">{t.subzona_codigo} – {t.subzona_nombre}</p>
                    <p>{LABEL_TIPO[t.tipo_tacho]}</p>
                    <p className="font-mono text-slate-400">{Number(t.lat).toFixed(6)}, {Number(t.lng).toFixed(6)}</p>
                    <div className="flex justify-center py-1">
                      <QRCodeSVG value={`${QR_BASE_URL}${t.codigo_qr}`} size={80} level="M" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicion(t)} className="flex-1 bg-[#00b488] text-white text-xs font-semibold py-1 rounded">Editar</button>
                      <button onClick={() => imprimirQR(t)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-1 rounded">🖨 QR</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Pin nuevo arrastrable */}
            {pinPos && (
              <Marker
                position={[pinPos.lat, pinPos.lng]}
                icon={crearIconoTacho('GENERAL', true)}
                draggable
                ref={markerRef}
                eventHandlers={{
                  dragend(e) {
                    const { lat, lng } = e.target.getLatLng()
                    setPinPos({ lat, lng })
                    verificarPinEnSubzona({ lat, lng })
                  },
                }}
              >
                <Popup>
                  <span className="text-xs font-mono text-slate-600">
                    {pinPos.lat.toFixed(6)}, {pinPos.lng.toFixed(6)}
                  </span>
                </Popup>
              </Marker>
            )}

            <CapturaClic modoCaptura={modoCaptura} onClic={handleClicMapa} />
          </MapContainer>
        </div>

        {/* ══════════════════════════════════════════════════════════
            Panel formulario — diseño CU-CAT-02
        ══════════════════════════════════════════════════════════ */}
        {form && (
          <div
            className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto"
            style={{ maxHeight: 480 }}
          >
            {/* Cabecera */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {editando ? 'Editar Contenedor' : 'Registro de Contenedor'}
                  </p>
                  {editando && (
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                      UUID: {tachos.find(t => t.id_tacho === editando)?.codigo_qr?.slice(0, 22)}…
                    </p>
                  )}
                </div>
                {!editando && (
                  <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                    UUID GENERADO
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-4 space-y-3 flex-1">

              {/* Fila 1: Código visible + Subzona detectada */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Código Visible *</label>
                  <input
                    value={form.codigo_visible}
                    onChange={e => setForm(f => ({ ...f, codigo_visible: e.target.value }))}
                    placeholder="TCH-010"
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subzona Detectada</label>
                  <div className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 flex items-center gap-1.5 min-h-[38px]">
                    {subzonaDelPin ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="text-slate-700 font-semibold truncate">
                          {subzonaDelPin.codigo}: {subzonaDelPin.nombre}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Sin detectar</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fila 2: Coordenadas */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Coordenadas Satelitales (WGS84)</label>
                <div className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 font-mono text-slate-600 flex items-center gap-1 min-h-[38px]">
                  {pinPos ? (
                    <>
                      <span className="text-slate-400">Lat:</span>
                      <span>{pinPos.lat.toFixed(6)}</span>
                      <span className="text-slate-300 mx-1.5">|</span>
                      <span className="text-slate-400">Lng:</span>
                      <span>{pinPos.lng.toFixed(6)}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Haz clic en el mapa…</span>
                  )}
                </div>
              </div>

              {/* Fila 3: Tipo de residuo */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo de Residuo *</label>
                <select
                  value={form.tipo_tacho}
                  onChange={e => setForm(f => ({ ...f, tipo_tacho: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {Object.entries(LABEL_TIPO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {/* Fila 4: Estado físico + operativo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estado Físico</label>
                  <select
                    value={form.estado_fisico}
                    onChange={e => setForm(f => ({ ...f, estado_fisico: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {Object.entries(LABEL_EST_FIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estado Op.</label>
                  <select
                    value={form.estado_operativo}
                    onChange={e => setForm(f => ({ ...f, estado_operativo: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {Object.entries(LABEL_EST_OP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Fila 5: Referencia + QR preview lado a lado */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Material / Referencia de Ubicación</label>
                <div className="mt-1 flex gap-3 items-start">
                  <textarea
                    rows={3}
                    value={form.direccion_referencia}
                    onChange={e => setForm(f => ({ ...f, direccion_referencia: e.target.value }))}
                    placeholder={'Polietileno HDPE alta densidad.\nEsq. Av. León Velarde con 2 de Mayo'}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <div className="p-1.5 border border-emerald-200 rounded-lg bg-emerald-50">
                      <QRCodeSVG
                        value={`${QR_BASE_URL}${form.codigo_visible || 'NUEVO'}`}
                        size={62}
                        fgColor="#0f172a"
                        bgColor="#f0fdf4"
                        level="M"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wide">QR CIUDADANO</span>
                  </div>
                </div>
              </div>

              {/* Indicador de validez */}
              {pinPos && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border ${
                  pinDentro === false
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${pinDentro === false ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                  {pinDentro === false
                    ? 'La ubicación está fuera de los sectores habilitados'
                    : 'Ubicación válida dentro de la subzona habilitada'}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="px-5 pb-5 pt-2 flex gap-2">
              <button
                onClick={() => { setForm(null); setPinPos(null); setPinDentro(null); setEditando(null); setModoCaptura(false); setError('') }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >Cancelar</button>
              <button
                onClick={handleGuardar}
                disabled={cargando || pinDentro === false}
                title={pinDentro === false ? 'Mueve el marcador a una zona habilitada' : ''}
                className="flex-1 bg-[#00b488] hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {cargando ? 'Guardando…' : editando ? 'Actualizar' : 'Guardar y Asociar QR'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabla inventario ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
            Inventario de Tachos y Contenedores Urbanos
          </h2>
          <div className="flex gap-3">
            <input
              value={filtroBusq}
              onChange={e => setFiltroBusq(e.target.value)}
              placeholder="Buscar código, subzona…"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-52"
            />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(LABEL_TIPO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-semibold">Código</th>
                <th className="px-5 py-3 text-left font-semibold">Subzona Asignada</th>
                <th className="px-5 py-3 text-left font-semibold">Tipo de Residuo</th>
                <th className="px-5 py-3 text-left font-semibold">Coordenadas GPS</th>
                <th className="px-5 py-3 text-left font-semibold">Estado Operativo</th>
                <th className="px-5 py-3 text-left font-semibold">UUID / QR</th>
                <th className="px-5 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tachosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No hay tachos registrados aún.
                  </td>
                </tr>
              )}
              {tachosFiltrados.map((t, i) => (
                <tr key={t.id_tacho} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-5 py-3">
                    <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2 py-1 rounded-md">
                      {t.codigo_visible}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-medium">
                    {t.subzona_codigo} – {t.subzona_nombre}
                  </td>
                  <td className="px-5 py-3">{badgeTipo(t.tipo_tacho)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    {Number(t.lat).toFixed(6)}, {Number(t.lng).toFixed(6)}
                  </td>
                  <td className="px-5 py-3">{badgeOp(t.estado_operativo)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 truncate max-w-[90px]">
                        {String(t.codigo_qr).slice(0, 8)}…
                      </span>
                      <button
                        onClick={() => setQrGuardado({ uuid: t.codigo_qr, codigo_visible: t.codigo_visible })}
                        className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 font-semibold px-2 py-1 rounded-lg transition-colors"
                        title="Ver QR"
                      >📱 QR</button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEdicion(t)}
                        className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >Editar</button>
                      <button
                        onClick={() => imprimirQR(t)}
                        className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        title="Exportar QR listo para imprimir"
                      >🖨 QR</button>
                      <button
                        onClick={() => handleBaja(t.id_tacho)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >Baja</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tachosFiltrados.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            Mostrando {tachosFiltrados.length} de {tachos.length} tachos activos
          </div>
        )}
      </div>
    </div>
  )
}
