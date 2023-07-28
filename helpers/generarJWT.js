import jwt from "jsonwebtoken"

const generarJWT = (id) => {
    const token = jwt.sign({id}, process.env.PALABRA_CLAVE, {expiresIn: '6h'});
    return token
}

export default generarJWT