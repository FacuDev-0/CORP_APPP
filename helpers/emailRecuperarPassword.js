import nodemailer from 'nodemailer'
import dotenv from 'dotenv/config'
const emailRecuperarPassword = async (datos) =>{

    let transport = nodemailer.createTransport({
        host: process.env.NM_HOST,
        port: process.env.NM_PORT,
        auth: {
          user: process.env.NM_USER,
          pass: process.env.NM_PASS
        }
      });

    const {email, nombre, token} = datos
    const href = `${process.env.CLIENTE_URL}/recuperarPassword/${token}`

    const info = await transport.sendMail({
        from: 'INISA - Instituto Nacional de Inclusión Social Adolescente ',
        to: email,
        subject: 'Recupera Tu Password',
        text: 'Recupera Tu Password',
        html:`
            <h2>Hola ${nombre}.</h2>
            <p>Recupera Tu Password,Cambiar Password Aqui.
            <a href="${href}">Cambiar Password</a></p>
        `
    })

    console.log("Message sent: %s", info.messageId);
}

export default emailRecuperarPassword