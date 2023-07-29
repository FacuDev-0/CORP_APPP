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

// router.get('/', async (req,res) => {
//     try{
//         res.status(200).json({msg: 'desde servidor'})
//     }catch(error){
//         res.status(400).json({msg: 'desde servidor'})
//     }
// })
router.post('/', autenticar)
router.post('/registrarUsuario', registrarUsuario)
router.get('/confirmar/:token', confirmarRegistro)
router.post('/olvidePassword', olvidePassword)

router.route('/recuperarPassword/:token')
    .get(confirmarToken)
    .put(nuevoPassword)


export default router