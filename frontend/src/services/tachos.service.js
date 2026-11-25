const BASE = 'http://localhost:3001/api'

const fetchJSON = async (url, options = {}) => {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud')
  return data
}

export const getTachos       = ()       => fetchJSON(`${BASE}/tachos`)
export const crearTacho      = (body)   => fetchJSON(`${BASE}/tachos`, { method: 'POST', body: JSON.stringify(body) })
export const editarTacho     = (id, body) => fetchJSON(`${BASE}/tachos/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const cambiarEstado   = (id, estado_operativo) =>
  fetchJSON(`${BASE}/tachos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado_operativo }) })
export const darBajaTacho    = (id)     => fetchJSON(`${BASE}/tachos/${id}`, { method: 'DELETE' })
export const getSubzonas     = ()       => fetchJSON(`${BASE}/zonificacion/subzonas`)
