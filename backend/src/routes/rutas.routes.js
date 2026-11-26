import { Router } from 'express'
import { verificarToken, autorizar } from '../middlewares/auth.middleware.js'
import {
  getRutas,
  getResumenRutas,
  crearRuta,
  editarRuta,
  cambiarEstadoRuta,
  getSubzonasDeRuta,
} from '../controllers/rutas.controller.js'

const router = Router()

router.use(verificarToken)

router.get('/resumen',        autorizar('ADMIN_FISCALIZADOR'), getResumenRutas)
router.get('/',               autorizar('ADMIN_FISCALIZADOR', 'RESPONSABLE_RUTA'), getRutas)
router.post('/',              autorizar('ADMIN_FISCALIZADOR'), crearRuta)
router.put('/:id',            autorizar('ADMIN_FISCALIZADOR'), editarRuta)
router.patch('/:id/estado',   autorizar('ADMIN_FISCALIZADOR'), cambiarEstadoRuta)
router.get('/:id/subzonas',   autorizar('ADMIN_FISCALIZADOR', 'RESPONSABLE_RUTA'), getSubzonasDeRuta)

export default router