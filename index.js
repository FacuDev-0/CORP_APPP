import express from 'express'
import inicioRouter from './router/inicioRouter.js'
import appRouter from './router/appRouter.js' // Atencion
import dataBase from './config/db.js'
import cors from "cors"
import dotenv from 'dotenv/config'

const app = express()

app.use(express.urlencoded({extended: true}))

app.use(express.json());

dataBase.authenticate()
    .then(() => console.log('Conectado correctamente'))
    .catch(error => console.log(error))

const clienteURL = process.env.CLIENTE_URL // URL del cliente

const corsOptions = {
    origin: function (origin, callback) {
      if (clienteURL.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
}

app.use(cors( corsOptions ))
app.use('/inisa',cors( corsOptions ), inicioRouter )
app.use('/inisa/admin',cors( corsOptions ), appRouter )

const port = 4000

app.listen(port, () =>{
    console.log('Base de Datos conectada' + port)
})