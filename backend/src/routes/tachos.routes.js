import { Router } from 'express'
import { verificarToken, autorizar } from '../middlewares/auth.middleware.js'
import {
  getTachos,
  crearTacho,
  editarTacho,
  cambiarEstadoTacho,
  darBajaTacho,
} from '../controllers/tachos.controller.js'

const router = Router()

const soloAdmin = autorizar('ADMIN_FISCALIZADOR')

router.get   ('/',           verificarToken,            getTachos)
router.post  ('/',           verificarToken, soloAdmin, crearTacho)
router.put   ('/:id',        verificarToken, soloAdmin, editarTacho)
router.patch ('/:id/estado', verificarToken, soloAdmin, cambiarEstadoTacho)
router.delete('/:id',        verificarToken, soloAdmin, darBajaTacho)

export default router
