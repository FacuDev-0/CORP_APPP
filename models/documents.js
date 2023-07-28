import { Sequelize } from "sequelize";
import dataBase from "../config/db.js";

const DocumentsUp = dataBase.define('documents', {
    id:{
        type: Sequelize.STRING,
        primaryKey:true
    },
    document_owner:{
        type: Sequelize.STRING
    },
    name:{
        type: Sequelize.STRING
    },
    uploadedby:{
        type: Sequelize.STRING
    },
    type:{
        type: Sequelize.NUMBER
    },
    mimetype:{
        type: Sequelize.STRING,
    },
    location_folderId:{
        type: Sequelize.NUMBER
    },
    location_path:{
        type: Sequelize.STRING,
        defaultValue: undefined
    }

},{
    timestamps: false,
    tableName:'documents'
})

export default  DocumentsUp