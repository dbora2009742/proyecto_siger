import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

export const getUsuarios = (params) =>
  axios.get(`${API}/api/usuarios`, { ...getHeaders(), params })

export const crearUsuario = (data) =>
  axios.post(`${API}/api/usuarios`, data, getHeaders())

export const editarUsuario = (id, data) =>
  axios.put(`${API}/api/usuarios/${id}`, data, getHeaders())

export const cambiarEstado = (id, activo) =>
  axios.patch(`${API}/api/usuarios/${id}/estado`, { activo }, getHeaders())

export const getAuditoria = () =>
  axios.get(`${API}/api/usuarios/auditoria`, getHeaders())
