const BASE = 'http://localhost:3001/api/zonificacion'

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const fetchJSON = async (url, options = {}) => {
  const r = await fetch(url, { ...options, headers: headers() })
  const j = await r.json()
  if (!j.ok) throw new Error(j.message)
  return j.data
}

/* ── Zonas Macro ── */
export const getZonasMacro = () =>
  fetchJSON(`${BASE}/zonas-macro`)

export const crearZonaMacro = ({ codigo, nombre, descripcion }) =>
  fetchJSON(`${BASE}/zonas-macro`, {
    method: 'POST',
    body: JSON.stringify({ codigo, nombre, descripcion }),
  })

export const actualizarGeometriaMacro = (id, geojson) =>
  fetchJSON(`${BASE}/zonas-macro/${id}/geometria`, {
    method: 'PUT',
    body: JSON.stringify({ geojson }),
  })

/* ── Subzonas ── */
export const getSubzonas = () =>
  fetchJSON(`${BASE}/subzonas`)

export const crearSubzona = (body) =>
  fetchJSON(`${BASE}/subzonas`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const editarSubzona = (id, body) =>
  fetchJSON(`${BASE}/subzonas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const actualizarGeometriaSubzona = (id, geojson) =>
  fetchJSON(`${BASE}/subzonas/${id}/geometria`, {
    method: 'PUT',
    body: JSON.stringify({ geojson }),
  })

export const cambiarEstado = (id, estado) =>
  fetchJSON(`${BASE}/subzonas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
