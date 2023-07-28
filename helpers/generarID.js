// Generador de Id unico
const generarId = () =>{
    return Date.now().toString(32) + Math.random().toString(32).substring(2,12)
}

export default generarId