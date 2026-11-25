import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { crearUsuario, editarUsuario } from '../../../services/usuarios.service'
import Swal from 'sweetalert2'

const ROLES = [
  { value: 'ADMIN_FISCALIZADOR', label: 'Admin / Fiscalizador' },
  { value: 'RESPONSABLE_RUTA',   label: 'Responsable de Ruta' },
  { value: 'OPERADOR_BALANZA',   label: 'Operador de Balanza' },
]

export default function ModalUsuario({ usuario, onClose, onGuardado }) {
  const esEdicion = !!usuario
  const [showPass, setShowPass] = useState(false)
  const [rolSeleccionado, setRolSeleccionado] = useState(usuario?.rol ?? '')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre_completo: usuario?.nombres_apellidos ?? '',
      dni:                usuario?.dni                ?? '',
      correo:             usuario?.correo             ?? '',
      password:           '',
      rol:                usuario?.rol                ?? '',
      licencia_categoria: usuario?.licencia_categoria ?? '',
      licencia_numero:    usuario?.licencia_numero    ?? '',
      punto_asignado:     usuario?.punto_asignado     ?? '',
    }
  })

  const rolActual = watch('rol')
  useEffect(() => { setRolSeleccionado(rolActual) }, [rolActual])

  const onSubmit = async (data) => {
    try {
      const payload = { ...data }
      if (esEdicion && !payload.password) delete payload.password
      if (esEdicion) {
        await editarUsuario(usuario.id_usuario, payload)
        Swal.fire('Actualizado', 'Usuario editado correctamente', 'success')
      } else {
        await crearUsuario(payload)
        Swal.fire('Creado', 'Usuario registrado correctamente', 'success')
      }
      onGuardado()
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Error al guardar el usuario'
      Swal.fire('Error', msg, 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0b1329]/55" onClick={onClose} />

      {/* Card modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">

        {/* Header */}
        <div className="flex items-center justify-between bg-[#0b1329] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              {esEdicion ? 'EDITAR USUARIO' : 'NUEVO USUARIO DEL SISTEMA'}
            </h2>
            <span className="bg-[#1e2c4a] text-[#2dd4bf] text-[10px] font-bold px-3 py-1 rounded-md">
              CU-SEG-01
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 flex flex-col gap-5">

          {/* Nombres */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Nombres y Apellidos <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre_completo', { required: 'Campo requerido' })}
              placeholder="Ej. Marco Antonio Vargas Huamán"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
            />
            {errors.nombre_completo && <p className="text-red-500 text-xs mt-1">{errors.nombre_completo.message}</p>}
          </div>

          {/* DNI + Correo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                DNI (8 dígitos) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('dni', {
                  required: 'Campo requerido',
                  pattern: { value: /^\d{8}$/, message: 'Debe tener exactamente 8 dígitos' }
                })}
                placeholder="47829105"
                maxLength={8}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
              />
              {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Correo Institucional <span className="text-red-500">*</span>
              </label>
              <input
                {...register('correo', {
                  required: 'Campo requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' }
                })}
                placeholder="mvargas.ruta@munitambopata.gob.pe"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488]"
              />
              {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo.message}</p>}
            </div>
          </div>

          {/* Contraseña + Rol */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Contraseña Temporal {!esEdicion && <span className="text-red-500">*</span>}
                {esEdicion && <span className="text-slate-400 font-normal"> (dejar vacío para no cambiar)</span>}
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    validate: (v) => {
                      if (!esEdicion && (!v || v.length < 8)) return 'Mínimo 8 caracteres'
                      if (esEdicion && v && v.length < 8) return 'Mínimo 8 caracteres'
                      return true
                    }
                  })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Rol del Sistema <span className="text-red-500">*</span>
              </label>
              <select
                {...register('rol', { required: 'Selecciona un rol' })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b488]/40 focus:border-[#00b488] bg-white"
              >
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.rol && <p className="text-red-500 text-xs mt-1">{errors.rol.message}</p>}
            </div>
          </div>

          {/* Panel datos adicionales — Responsable de Ruta */}
          {rolSeleccionado === 'RESPONSABLE_RUTA' && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-xs font-bold text-violet-800 mb-0.5">DATOS ADICIONALES — RESPONSABLE DE RUTA</p>
              <p className="text-[10.5px] text-violet-500 mb-3">Habilitado automáticamente por selección del rol operativo en campo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Categoría de Licencia</label>
                  <select
                    {...register('licencia_categoria', { required: 'Requerido para este rol' })}
                    className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="A-IIIa">A-IIIa</option>
                    <option value="A-IIIb">A-IIIb</option>
                    <option value="A-IIIc">A-IIIc (Vehículos Pesados)</option>
                  </select>
                  {errors.licencia_categoria && <p className="text-red-500 text-xs mt-1">{errors.licencia_categoria.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">N° de Licencia</label>
                  <input
                    {...register('licencia_numero', { required: 'Requerido para este rol' })}
                    placeholder="Q47829105"
                    className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  {errors.licencia_numero && <p className="text-red-500 text-xs mt-1">{errors.licencia_numero.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Panel datos adicionales — Operador de Balanza */}
          {rolSeleccionado === 'OPERADOR_BALANZA' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 mb-3">DATOS ADICIONALES — OPERADOR DE BALANZA</p>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Punto Asignado</label>
                <input
                  {...register('punto_asignado')}
                  placeholder="Ej. Relleno Sanitario"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>
          )}

          {/* Hint contraseña */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <span className="text-amber-500 text-sm mt-0.5">⚠</span>
            <p className="text-[10.5px] text-amber-800">
              La contraseña temporal debe tener mínimo 8 caracteres. El usuario deberá cambiarla en su primer ingreso.
              El registro quedará en el log de auditoría automáticamente.
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
              {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
