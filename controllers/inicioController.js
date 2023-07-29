import Users from "../models/users.js"
import BcryptObj from "../middleware/crypt_Password.js"
import emailRegistro from "../helpers/emailRegistro.js"
import emailRecuperarPassword from "../helpers/emailRecuperarPassword.js"
import generarId from "../helpers/generarID.js"
import generarJWT from "../helpers/generarJWT.js"

const autenticar = async (req, res) => {
    const {email, password} = req.body
    
    try{
        //Consultar el usuario
        // const usuario = await Users.findOne({ where:{ email } })
        // if(!usuario) {
        //     res.status(404).json({msg: 'Correo Invalidoo'})
        //     return
        // }
        // //Existe Usuario: comparar password hasheado con el ingresado
        // const confirmPass = await new BcryptObj(usuario).confirmPass(password)
        // if(!confirmPass){
        //     return res.status(404).json({msg: 'Password Invalido'})
        // } 

        // const usuarioObj = {
        //     name: 'Facundo',
        //     email: usuario.email,
        //     id: usuario.id,
        //     token: generarJWT(usuario.id)
        // }

        //Password Correcto: Enviar respuesta al Cliente
        res.status(200).json({msg: 'desde inicio'})
    }catch(error){
        res.status(400).json({msg: "Hubo un error"})
    }
}

const registrarUsuario = async (req, res) =>{
    // HashPass: Devuelve el usuario completo con el password hasheado
    const datos = await new BcryptObj(req.body).hashPass()
    
    try{
        const usuario = await Users.create(datos)
        emailRegistro({
            email: usuario.email,
            nombre: usuario.name,
            token: usuario.token
        })
        res.status(200).json({msg: 'Registrado Correctamente'})
    }catch(err){
        res.status(400).json({msg: 'Usuario ya registrado'})
        console.log(err)
    }
}

const confirmarRegistro = async (req, res) =>{
    //Validar cuenta
    const {token} = req.params
    //Confirmar token existente
    const tokenValido = await Users.findOne({where:{token}})
    if(!tokenValido)return res.status(400).json({msg: 'Hubo un error'})
    
    //Se confirma la cuetna y se elimina el token de la DB
    try{
        await Users.update({
            token: null
            // confirm: null
        },{ where:{token} })

        res.status(200).json({msg: 'Cuenta Confirmada'})
    }catch(error){
        res.status(400).json({msg: 'Hubo un error'})
    }
}

const olvidePassword = async (req, res) =>{
    const {email} = req.body
    const token = generarId()
    // Confirmar existencia de Usuario
    const usuario = await Users.findOne({where:{email}})
    if(!usuario)return res.status(404).json({msg: 'No existe Usuario'})

    try{
        //Generar un token en el usuario
        await Users.update({token},{ where:{email} })

        // Confirmar cambio de password en correo
        emailRecuperarPassword({
            email,
            nombre: usuario.name,
            token
        })
        res.status(200).json({msg: 'Revisa tu Correo'})
    }catch(error){
        res.status(400).json({msg: 'Hubo Un Error'})
    }

}

const confirmarToken = async (req,res) =>{
    // Confirmar si token existe
    const {token} = req.params
    const tokenValido = await Users.findOne({where:{token}})
    if(!tokenValido) return res.status(400).json({msg: 'Hubo Un Error'})

    res.status(200).json('Token Confirmado')
}

const nuevoPassword = async (req, res) =>{
    const { token } = req.params
    const newPassword = req.body.password
    //Conseguir datos del usuario
    const dataUsuario = await Users.findOne({where:{token}})
    if(!dataUsuario) return res.status(400).json({msg: 'Hubo un error'})

    try{
        //Cambiar password de los datos
        dataUsuario.password = newPassword
        //Hashear Password
        const usuario = await new BcryptObj(dataUsuario).hashPass()
        //Cambiar password y eliminar el token
        await Users.update({
            token: null,
            password: usuario.password
        },{where:{token}})
        res.status(200).json({msg: 'Password Actualizado Correctamente'})
    }catch(error){
        res.status(400).json({msg: 'Hubo un error'})
    }
}


export {
    autenticar,
    registrarUsuario,
    confirmarRegistro,
    olvidePassword,
    confirmarToken,
    nuevoPassword
}