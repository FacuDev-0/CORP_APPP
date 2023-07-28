import dataBase from "../config/db.js";
import { Sequelize } from "sequelize";
import generarId from "../helpers/generarID.js";

const Users = dataBase.define('usuarios', {
    name: {
        type: Sequelize.STRING
    },
    second_name: {
        type: Sequelize.STRING
    },
    last_name: {
        type: Sequelize.STRING
    },
    second_last_name: {
        type: Sequelize.STRING
    },
    age: {
        type: Sequelize.DATE
    },
    email: {
        type: Sequelize.STRING
    },
    password: {
        type: Sequelize.STRING,
    },
    document: {
        type: Sequelize.NUMBER
    },
    token: {
        type: Sequelize.STRING,
        defaultValue: generarId
    }
}, {
    timestamps: false, // Evita que se incluyan automáticamente las columnas createdAt y updatedAt
    tableName: 'usuarios' // Nombre de la tabla en la base de datos
})

export default Users