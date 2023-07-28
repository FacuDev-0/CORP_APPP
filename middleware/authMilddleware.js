import jwt from 'jsonwebtoken';
import Users from '../models/users.js';

const chackAuth = async (req, res, next) =>{
    let token
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try{

            token = req.headers.authorization.split(' ')[1] 
            const decode = jwt.verify(token, process.env.PALABRA_CLAVE)

            req.usuario = await Users.findOne({
                where: {
                    id: decode.id
                },
                attributes: {
                     exclude: ['password', 'token']
            }})
            return next()
        }catch(error){
            res.status(404).json({msg: 'Token Invalido o Insexistende'})
        }
    } 
    if(!token){
        res.status(404).json({msg: 'Token No Valido'})
    }
}

export default chackAuth