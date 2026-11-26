import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { crearRuta, editarRuta, getSubzonasDeRuta } from '../../../services/rutas.service'
import { getEquipos } from '../../../services/equipos.service'
import Swal from 'sweetalert2'

const TURNOS = [
  { value: 'MANANA', label: '🌅 Mañana' },
  { value: 'TARDE',  label: '🌤 Tarde'  },
  { value: 'NOCHE',  label: '🌙 Noche'  },
]

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

export default function ModalRuta({ ruta, onClose, onGuardado }) {
  const esEdicion = !!ruta
  const [equipos, setEquipos]       = useState([])
  const [subzonas, setSubzonas]     = useState([])   // subzonas ya asignadas [{id_subzona, nombre, orden_secuencia}]
  const [diasSel, setDiasSel]       = useState(
    ruta?.dias_semana ? ruta.dias_semana.split(',').map(d => d.trim()) : []
  )
  const [cargando, setCargando]     = useState(true)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre:    ruta?.nombre    ?? '',
      codigo:    ruta?.codigo    ?? '',
      turno:     ruta?.turno     ?? '',
      id_equipo: ruta?.id_equipo ?? '',
    }
  })

  useEffect(() => {
    const cargar = async () => {
      try {
        const resEq = await getEquipos({ activo: 'true' })
        setEquipos(resEq.data?.data ?? [])

        if (esEdicion) {
          const resSz = await getSubzonasDeRuta(ruta.id_ruta)
          setSubzonas(resSz.data?.data ?? [])
        }
      } catch {
        Swal.fire('Error', 'No se pudieron cargar los datos', 'error')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const toggleDia = (dia) => {
    setDiasSel(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  const onSubmit = async (data) => {
    if (diasSel.length === 0) {
      Swal.fire('Atención', 'Selecciona al menos un día de la semana', 'warning')
      return
    }
    try {
      const payload = {
        nombre:      data.nombre.trim(),
        codigo:      data.codigo.trim().toUpperCase(),
        turno:       data.turno,
        dias_semana: diasSel.join(','),
        id_equipo:   Number(data.id_equipo),
        subzonas:    subzonas.map((s, i) => ({
          id_subzona:      s.id_subzona,
          orden_secuencia: i + 1,
        })),
      }
      if (esEdicion) {
        await editarRuta(ruta.id_ruta, payload)
        Swal.fire('Actualizado', 'Ruta editada correctamente', 'success')
      } else {
        await crearRuta(payload)
        Swal.fire('Creada', 'Ruta registrada correctamente', 'success')
      }
      onGuardado()
    } catch (err) {
      const msg = err?.response?.data?.mensaje ?? 'Error al guardar la ruta'
      Swal.fire('Error', msg, 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#0b1329]/55" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">

        {/* Header navy */}
        <div className="flex items-center justify-between bg-[#0b1329] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              {esEdicion ? 'EDITAR RUTA PROGRAMADA' : 'NUEVA RUTA PROGRAMADA'}
            </h2>
            <span className="bg-[#1e2c4a] text-[#2dd4bf] text-[10px] font-bold px-3 py-1 rounded-md">
              CU-REC-03
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando datos...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 flex flex-col gap-5">

            {/* Nombre + Código */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Nombre de la Ruta <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('nombre', { required: 'Campo requerido' })}
                  placeholder="Ej. Ruta Casco Central"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('codigo', { required: 'Campo requerido' })}
                  placeholder="Ej. RUT-MDD-01"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
                />
                {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo.message}</p>}
              </div>
            </div>

            {/* Turno + Equipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Turno <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('turno', { required: 'Selecciona un turno' })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {TURNOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.turno && <p className="text-red-500 text-xs mt-1">{errors.turno.message}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Equipo de Trabajo <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('id_equipo', { required: 'Selecciona un equipo' })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {equipos.map(e => (
                    <option key={e.id_equipo} value={e.id_equipo}>
                      {e.nombre} — {e.placa}
                    </option>
                  ))}
                </select>
                {errors.id_equipo && <p className="text-red-500 text-xs mt-1">{errors.id_equipo.message}</p>}
              </div>
            </div>

            {/* Días de la semana */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">
                Días de la Semana <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      diasSel.includes(dia)
                        ? 'bg-emerald-50 border-[#00b488] text-teal-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {dia.slice(0, 3)}
                  </button>
                ))}
              </div>
              {diasSel.length === 0 && (
                <p className="text-slate-400 text-xs mt-1">Selecciona al menos un día</p>
              )}
            </div>

            {/* Subzonas asignadas (solo lectura en esta versión) */}
            {esEdicion && subzonas.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">
                  Subzonas asignadas ({subzonas.length})
                </label>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {subzonas.map((s, i) => (
                    <div key={s.id_subzona} className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-mono text-slate-400">{s.codigo}</span>
                      <span>{s.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <span className="text-amber-500 text-sm mt-0.5">⚠</span>
              <p className="text-[10.5px] text-amber-800">
                El código de ruta se guardará en mayúsculas automáticamente.
                La asignación detallada de subzonas y su orden se gestiona desde la vista de detalle de la ruta.
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#00b488] hover:bg-[#009e78] disabled:opacity-60 transition-colors shadow"
              >
                {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Guardar Ruta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
