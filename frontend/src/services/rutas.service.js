import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

export const getRutas           = (params = {}) => axios.get(`${BASE}/rutas`,              { ...authHeader(), params })
export const getResumenRutas    = ()             => axios.get(`${BASE}/rutas/resumen`,       authHeader())
export const getSubzonasDeRuta  = (id)           => axios.get(`${BASE}/rutas/${id}/subzonas`, authHeader())
export const crearRuta          = (data)         => axios.post(`${BASE}/rutas`,             data, authHeader())
export const editarRuta         = (id, data)     => axios.put(`${BASE}/rutas/${id}`,        data, authHeader())
export const cambiarEstadoRuta  = (id, activa)   => axios.patch(`${BASE}/rutas/${id}/estado`, { activa }, authHeader())
