import { Router } from 'express'
import { verificarToken, autorizar } from '../middlewares/auth.middleware.js'
import {
  getZonasMacro,
  crearZonaMacro,
  actualizarGeometriaMacro,
  getSubzonas,
  crearSubzona,
  editarSubzona,
  cambiarEstadoSubzona,
} from '../controllers/zonificacion.controller.js'

const router = Router()
const soloAdmin = [verificarToken, autorizar('ADMIN_FISCALIZADOR')]

// Zonas macro
router.get  ('/zonas-macro',                  verificarToken, getZonasMacro)
router.post ('/zonas-macro',                  soloAdmin,      crearZonaMacro)
router.put  ('/zonas-macro/:id/geometria',    soloAdmin,      actualizarGeometriaMacro)

// Subzonas
router.get  ('/subzonas',                     verificarToken, getSubzonas)
router.post ('/subzonas',                     soloAdmin,      crearSubzona)
router.put  ('/subzonas/:id',                 soloAdmin,      editarSubzona)
router.patch('/subzonas/:id/estado',          soloAdmin,      cambiarEstadoSubzona)

export default router
