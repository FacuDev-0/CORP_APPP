import express from 'express'
import inicioRouter from './router/inicioRouter.js'
import appRouter from './router/appRouter.js' // Atencion
import dataBase from './config/db.js'
import cors from "cors"
import dotenv from 'dotenv/config'
import mercadopago from 'mercadopago'

const app = express()

app.use(express.urlencoded({extended: true}))

app.use(express.json());

dataBase.authenticate()
    .then(() => console.log('Conectado correctamente'))
    .catch(error => console.log(error))

const whitelist = [process.env.CLIENTE_URL, "http://localhost:4000", "https://localhost:4000",'https://api.mercadolibre.com', 'https://www.mercadopago.com.uy/'] // URL del cliente

const corsOptions = {
    origin: async function (origin, callback) {
      console.log(await origin)
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    optionsSuccessStatus: 200 
}

// app.use(cors( corsOptions ))

app.use('/inisa',cors( corsOptions ), inicioRouter )
app.use('/inisa/admin',cors( corsOptions ), appRouter )

const PORT = process.env.PORT || 4000

app.post('/notificacion', async (req, res) => { 
  const payment = req.query
  mercadopago.configure({
    access_token: 'TEST-4801198271321735-082609-d015c76879635e6a839b3e4b75e6ae64-1460878367'
  })
  if(payment.type === "payment"){
    const data = await mercadopago.payment.findById(payment['data.id'])
    console.log(data)
  }
})

app.listen(PORT, () =>{
    console.log('Base de Datos conectada en: ' + PORT)
})