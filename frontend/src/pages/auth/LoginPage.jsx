import { useState } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import logo from '../../assets/logo.png'

export default function LoginPage() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setCargando(true)
    setError('')
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', {
        correo: data.correo,
        password: data.password
      })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      window.location.href = '/usuarios'
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0d1f2d' }}>

      {/* Círculos decorativos fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: '#22c55e' }} />
        <div className="absolute -top-24 left-24 w-72 h-72 rounded-full opacity-5"
          style={{ backgroundColor: '#22c55e' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-5"
          style={{ backgroundColor: '#ffffff' }} />
      </div>

      {/* Panel izquierdo */}
<div className="hidden md:flex w-1/2 flex-col items-center justify-center gap-4 px-12 relative z-10">
  <img src={logo} alt="SIGER Logo" className="w-52 object-contain drop-shadow-lg" />
  <p className="text-white/60 text-center text-sm leading-relaxed max-w-xs">
    Sistema Integrado de Gestión de<br />Residuos Sólidos
  </p>
</div>


      {/* Panel derecho */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-10 py-12">

          {/* Logo visible solo en móvil */}
          <div className="flex flex-col items-center mb-6 md:hidden">
            <img src={logo} alt="SIGER Logo" className="w-20 h-20 object-contain mb-2" />
            <span className="text-gray-800 text-xl font-bold tracking-widest">SIGER</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2 tracking-wide">
            INICIAR SESIÓN
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            Ingresa tus credenciales institucionales para acceder
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Campo correo */}
            <div>
              <input
                type="text"
                placeholder="DNI o Correo institucional"
                className={`w-full border rounded-lg px-4 py-3 text-sm text-gray-700 outline-none transition
                  focus:ring-2 focus:ring-green-400
                  ${errors.correo ? 'border-red-400' : 'border-gray-200'}`}
                {...register('correo', { required: 'Este campo es requerido' })}
              />
              {errors.correo && (
                <p className="text-red-500 text-xs mt-1">{errors.correo.message}</p>
              )}
            </div>

            {/* Campo contraseña */}
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                className={`w-full border rounded-lg px-4 py-3 text-sm text-gray-700 outline-none transition
                  focus:ring-2 focus:ring-green-400
                  ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                {...register('password', { required: 'Este campo es requerido' })}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Error general */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-red-500 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Link olvidé contraseña */}
            <div className="text-right -mt-2">
              <a href="#" className="text-green-500 text-sm hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full text-white font-semibold py-3 rounded-lg transition text-sm tracking-wide"
              style={{ backgroundColor: cargando ? '#86efac' : '#22c55e' }}
              onMouseEnter={e => { if (!cargando) e.target.style.backgroundColor = '#16a34a' }}
              onMouseLeave={e => { if (!cargando) e.target.style.backgroundColor = '#22c55e' }}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>

          </form>
        </div>
      </div>

    </div>
  )
}
