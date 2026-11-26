import { Router } from 'express'
import { verificarToken, autorizar } from '../middlewares/auth.middleware.js'
import {
  getEquipos,
  crearEquipo,
  editarEquipo,
  cambiarEstadoEquipo,
  getSelectores,
} from '../controllers/equipos.controller.js'

const router = Router()

router.use(verificarToken)

router.get('/selectores', autorizar('ADMIN_FISCALIZADOR'), getSelectores)
router.get('/',           autorizar('ADMIN_FISCALIZADOR', 'RESPONSABLE_RUTA'), getEquipos)
router.post('/',          autorizar('ADMIN_FISCALIZADOR'), crearEquipo)
router.put('/:id',        autorizar('ADMIN_FISCALIZADOR'), editarEquipo)
router.patch('/:id/estado', autorizar('ADMIN_FISCALIZADOR'), cambiarEstadoEquipo)

export default router