const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

export const listarVehiculos = async (filtros = {}) => {
  const params = new URLSearchParams()
  if (filtros.tipo)   params.append('tipo',   filtros.tipo)
  if (filtros.estado) params.append('estado', filtros.estado)
  if (filtros.buscar) params.append('buscar', filtros.buscar)

  const res = await fetch(`${BASE}/api/flota?${params}`, { headers: getHeaders() })
  return res.json()
}

export const resumenFlota = async () => {
  const res = await fetch(`${BASE}/api/flota/resumen`, { headers: getHeaders() })
  return res.json()
}

export const crearVehiculo = async (datos) => {
  const res = await fetch(`${BASE}/api/flota`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(datos)
  })
  return res.json()
}

export const editarVehiculo = async (id, datos) => {
  const res = await fetch(`${BASE}/api/flota/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(datos)
  })
  return res.json()
}

export const cambiarEstadoVehiculo = async (id, estado_vehiculo) => {
  const res = await fetch(`${BASE}/api/flota/${id}/estado`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ estado_vehiculo })
  })
  return res.json()
}