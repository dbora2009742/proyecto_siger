import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

export const getEquipos         = (params = {}) => axios.get(`${BASE}/equipos`,           { ...authHeader(), params })
export const getSelectores      = ()             => axios.get(`${BASE}/equipos/selectores`, authHeader())
export const crearEquipo        = (data)         => axios.post(`${BASE}/equipos`,          data, authHeader())
export const editarEquipo       = (id, data)     => axios.put(`${BASE}/equipos/${id}`,     data, authHeader())
export const cambiarEstadoEquipo= (id, activo)   => axios.patch(`${BASE}/equipos/${id}/estado`, { activo }, authHeader())
