import { Sequelize } from "sequelize";
import dataBase from "../config/db.js";

const Expedientes = dataBase.define('expedintes', {
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
    birthday: {
        type: Sequelize.DATE
    },
    document: {
        type: Sequelize.NUMBER
    },
    email: {
        type: Sequelize.STRING
    },
    local: {
        type: Sequelize.STRING
    },
    phone: {
        type: Sequelize.STRING
    },
    cargo: {
        type: Sequelize.STRING
    },
}, {
    timestamps: false, // Evita que se incluyan automáticamente las columnas createdAt y updatedAt
    tableName: 'expedientes' // Nombre de la tabla en la base de datos
})

export default Expedientes