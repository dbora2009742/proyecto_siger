import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { crearEquipo, editarEquipo, getSelectores } from '../../../services/equipos.service'
import Swal from 'sweetalert2'

export default function ModalEquipo({ equipo, onClose, onGuardado }) {
  const esEdicion = !!equipo
  const [selectores, setSelectores] = useState({ vehiculos: [], responsables: [] })
  const [cargando, setCargando] = useState(true)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre:              equipo?.nombre              ?? '',
      id_responsable:      equipo?.id_responsable      ?? '',
      id_vehiculo:         equipo?.id_vehiculo          ?? '',
      integrantes_detalle: equipo?.integrantes_detalle  ?? '',
    }
  })

  useEffect(() => {
    getSelectores()
      .then(res => {
        const d = res.data?.data ?? {}
        // En edición incluir el vehículo actual aunque no esté DISPONIBLE
        let vehiculos = d.vehiculos ?? []
        if (esEdicion && equipo.id_vehiculo) {
          const yaEsta = vehiculos.find(v => v.id_vehiculo === equipo.id_vehiculo)
          if (!yaEsta) {
            vehiculos = [
              {
                id_vehiculo:   equipo.id_vehiculo,
                placa:         equipo.placa,
                codigo_interno: equipo.codigo_interno,
                tipo_vehiculo: equipo.tipo_vehiculo,
                capacidad_m3:  equipo.capacidad_m3,
                estado_vehiculo: equipo.estado_vehiculo,
              },
              ...vehiculos,
            ]
          }
        }
        setSelectores({ vehiculos, responsables: d.responsables ?? [] })
      })
      .catch(() => Swal.fire('Error', 'No se pudieron cargar los selectores', 'error'))
      .finally(() => setCargando(false))
  }, [])

  const onSubmit = async (data) => {
    try {
      const payload = {
        nombre:              data.nombre.trim(),
        id_vehiculo:         Number(data.id_vehiculo),
        id_responsable:      Number(data.id_responsable),
        integrantes_detalle: data.integrantes_detalle?.trim() || null,
      }
      if (esEdicion) {
        await editarEquipo(equipo.id_equipo, payload)
        Swal.fire('Actualizado', 'Equipo editado correctamente', 'success')
      } else {
        await crearEquipo(payload)
        Swal.fire('Creado', 'Equipo registrado correctamente', 'success')
      }
      onGuardado()
    } catch (err) {
      const msg = err?.response?.data?.mensaje ?? 'Error al guardar el equipo'
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
              {esEdicion ? 'EDITAR EQUIPO DE TRABAJO' : 'NUEVO EQUIPO DE TRABAJO'}
            </h2>
            <span className="bg-[#1e2c4a] text-[#2dd4bf] text-[10px] font-bold px-3 py-1 rounded-md">
              CU-REC-02
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando selectores...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 flex flex-col gap-5">

            {/* Nombre */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Nombre de la Cuadrilla <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombre', { required: 'Campo requerido' })}
                placeholder="Ej. Cuadrilla Tambopata 1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>

            {/* Responsable + Vehículo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Responsable de Ruta <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('id_responsable', { required: 'Selecciona un responsable' })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {selectores.responsables.map(r => (
                    <option key={r.id_usuario} value={r.id_usuario}>
                      {r.nombres_apellidos} — {r.dni}
                    </option>
                  ))}
                </select>
                {errors.id_responsable && <p className="text-red-500 text-xs mt-1">{errors.id_responsable.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Vehículo Asignado <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('id_vehiculo', { required: 'Selecciona un vehículo' })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {selectores.vehiculos.map(v => (
                    <option key={v.id_vehiculo} value={v.id_vehiculo}>
                      {v.placa} · {v.tipo_vehiculo} · {v.capacidad_m3}m³
                    </option>
                  ))}
                </select>
                {errors.id_vehiculo && <p className="text-red-500 text-xs mt-1">{errors.id_vehiculo.message}</p>}
              </div>
            </div>

            {/* Integrantes */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Integrantes <span className="text-slate-400 font-normal">(conductor y operarios)</span>
              </label>
              <input
                {...register('integrantes_detalle')}
                placeholder="Ej. Pedro Ramos (conductor), Luis Yana, Ana Flores"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
              />
            </div>

            {/* Hint */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <span className="text-amber-500 text-sm mt-0.5">⚠</span>
              <p className="text-[10.5px] text-amber-800">
                Solo aparecen vehículos con estado <strong>DISPONIBLE</strong> y usuarios con rol <strong>RESPONSABLE_RUTA</strong> activos.
                En edición el vehículo actual se mantiene aunque haya cambiado de estado.
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
                {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Guardar Equipo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
