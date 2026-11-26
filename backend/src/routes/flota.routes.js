import { Router } from 'express'
import { verificarToken, autorizar } from '../middlewares/auth.middleware.js'
import {
  listarVehiculos,
  resumenFlota,
  crearVehiculo,
  editarVehiculo,
  cambiarEstado
} from '../controllers/flota.controller.js'

const router = Router()
const soloAdmin = autorizar('ADMIN_FISCALIZADOR')

router.get('/',             verificarToken, soloAdmin, listarVehiculos)
router.get('/resumen',      verificarToken, soloAdmin, resumenFlota)
router.post('/',            verificarToken, soloAdmin, crearVehiculo)
router.put('/:id',          verificarToken, soloAdmin, editarVehiculo)
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado)

export default router