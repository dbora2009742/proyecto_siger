import { useEffect, useState } from 'react'

export default function PanelSubzona({
  zonasMacro,
  subzonaEditando,
  dibujando,
  geojsonListo,
  onGuardar,
  onCancelar,
  onIniciarDibujo,
}) {
  const [form, setForm] = useState({ id_zona_macro: '', codigo: '', nombre: '' })
  const [error, setError] = useState('')
  const esEdicion = !!subzonaEditando

  useEffect(() => {
    setForm(subzonaEditando
      ? { id_zona_macro: subzonaEditando.id_zona_macro ?? '', codigo: subzonaEditando.codigo ?? '', nombre: subzonaEditando.nombre ?? '' }
      : { id_zona_macro: '', codigo: '', nombre: '' }
    )
    setError('')
  }, [subzonaEditando])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.id_zona_macro || !form.codigo || !form.nombre) {
      setError('Sector, código y nombre son obligatorios.')
      return
    }
    setError('')
    onGuardar(form)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full overflow-y-auto">

      {/* Cabecera del panel */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
          {esEdicion ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#00b488" strokeWidth="2"/>
              <path d="M12 8v8M8 12h8" stroke="#00b488" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div>
          <p className="text-xs font-extrabold text-slate-800">
            {esEdicion ? 'Editar subzona' : 'Nueva subzona'}
          </p>
          <p className="text-[10px] text-slate-400">
            {esEdicion ? `Código: ${subzonaEditando.codigo}` : 'Completa los datos y dibuja en el mapa'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">

        {/* Sector */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
            Sector (Zona Macro)
          </label>
          <select
            value={form.id_zona_macro}
            onChange={e => set('id_zona_macro', e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
          >
            <option value="">— Seleccionar —</option>
            {zonasMacro.map(z => (
              <option key={z.id_zona_macro} value={z.id_zona_macro}>
                {z.codigo} — {z.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Código */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
            Código
          </label>
          <input
            type="text"
            value={form.codigo}
            onChange={e => set('codigo', e.target.value.toUpperCase())}
            disabled={esEdicion}
            placeholder="Ej. SZ-01"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
            Nombre
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Ej. Sector Centro"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00b488]"
          />
        </div>

        {/* Dibujo — solo en creación */}
        {!esEdicion && (
          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Polígono en mapa
            </label>
            <button
              type="button"
              onClick={onIniciarDibujo}
              className={`w-full text-xs rounded-lg px-3 py-2 border font-semibold transition-colors ${
                geojsonListo
                  ? 'bg-emerald-50 border-[#00b488] text-emerald-700'
                  : dibujando
                  ? 'bg-teal-50 border-teal-400 text-teal-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#00b488] hover:text-[#00b488]'
              }`}
            >
              {geojsonListo
                ? '✅ Polígono listo'
                : dibujando
                ? '🖊️ Dibujando… (doble clic para cerrar)'
                : '🗺️ Dibujar en el mapa'}
            </button>
            {dibujando && (
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Clic por vértice · Doble clic para cerrar · <kbd className="bg-slate-100 rounded px-1">Esc</kbd> cancela
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-[10.5px] text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 bg-[#00b488] hover:bg-[#009e78] text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
          >
            {esEdicion ? 'Actualizar' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold py-2 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
