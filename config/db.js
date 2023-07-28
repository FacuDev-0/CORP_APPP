import { Sequelize } from "sequelize";
import dotenv from 'dotenv/config'

const dataBase = new Sequelize(process.env.DB_NAME,process.env.DB_ROOT, process.env.DB_PASSWORD,{
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    define: {
        timestamps: false // Evita que se incluyan automáticamente las columnas createdAt y updated 
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    operatorAliases: false
})

export default dataBase