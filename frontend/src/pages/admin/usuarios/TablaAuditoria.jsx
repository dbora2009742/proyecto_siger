const ACCION_STYLE = {
  CREACION:    { label: 'CREAR CUENTA',  color: 'bg-emerald-100 text-emerald-700' },
  EDICION:     { label: 'EDITAR',        color: 'bg-blue-100 text-blue-700' },
  CAMBIO_ROL:  { label: 'EDITAR ROL',    color: 'bg-blue-100 text-blue-700' },
  BAJA:        { label: 'INHABILITAR',   color: 'bg-red-100 text-red-700' },
  ACTIVACION:  { label: 'ACTIVAR',       color: 'bg-emerald-100 text-emerald-700' },
  LOGIN:       { label: 'LOGIN',         color: 'bg-slate-100 text-slate-600' },
  LOGOUT:      { label: 'LOGOUT',        color: 'bg-slate-100 text-slate-600' },
}

export default function TablaAuditoria({ registros }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-[#0b1329] px-6 py-4 flex items-center justify-between">
        <div>
          <div className="w-32 h-0.5 bg-[#00b488] mb-2 rounded-full" />
          <h3 className="text-sm font-bold text-white">HISTORIAL RECIENTE DE AUDITORÍA</h3>
        </div>
        <span className="text-xs text-slate-400 bg-[#1e2c4a] px-3 py-1 rounded-md">
          Solo lectura · Últimos eventos
        </span>
      </div>

      {/* Columnas */}
      <div className="grid grid-cols-[1.4fr_1.8fr_1fr_3fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
        {['FECHA / HORA', 'ACTOR', 'ACCIÓN', 'DETALLE'].map((h) => (
          <span key={h} className="text-[10px] font-bold text-slate-400 tracking-wide">{h}</span>
        ))}
      </div>

      {/* Filas */}
      {registros.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">Sin eventos registrados</div>
      ) : (
        registros.map((r, i) => {
          const estilo = ACCION_STYLE[r.accion] ?? { label: r.accion, color: 'bg-slate-100 text-slate-600' }
          const fecha = new Date(r.fecha_hora).toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
          return (
            <div
              key={r.id_auditoria}
              className={`grid grid-cols-[1.4fr_1.8fr_1fr_3fr] gap-4 px-6 py-3.5 items-center border-b border-slate-50 ${
                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
              }`}
            >
              <span className="text-xs text-slate-500 font-mono">{fecha}</span>
              <span className="text-xs font-semibold text-slate-800">{r.actor_nombre ?? '—'}</span>
              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold w-fit ${estilo.color}`}>
                {estilo.label}
              </span>
              <span className="text-xs text-slate-600 truncate">
                {r.detalle_json?.descripcion ?? JSON.stringify(r.detalle_json ?? {})}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
