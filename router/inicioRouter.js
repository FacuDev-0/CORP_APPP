import express from 'express'
import {
    autenticar,
    registrarUsuario,
    confirmarRegistro,
    olvidePassword,
    confirmarToken,
    nuevoPassword
} from '../controllers/inicioController.js'

const router = express.Router()

router.post('/', autenticar)
router.post('/registrarUsuario', registrarUsuario)
router.get('/confirmar/:token', confirmarRegistro)
router.post('/olvidePassword', olvidePassword)

router.route('/recuperarPassword/:token')
    .get(confirmarToken)
    .put(nuevoPassword)


export default router