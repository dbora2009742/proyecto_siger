import { Router } from 'express'
import { verificarToken, verificarRol } from '../middlewares/auth.middleware.js'
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstado,
  listarAuditoria
} from '../controllers/usuarios.controller.js'

const router = Router()
const soloAdmin = verificarRol(['ADMIN_FISCALIZADOR'])

// ⚠️ /auditoria ANTES de /:id para que no lo intercepte
router.get('/auditoria',    verificarToken, soloAdmin, listarAuditoria)
router.get('/',             verificarToken, soloAdmin, listarUsuarios)
router.post('/',            verificarToken, soloAdmin, crearUsuario)
router.put('/:id',          verificarToken, soloAdmin, editarUsuario)
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado)

export default router
