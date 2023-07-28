import express from 'express';
import chackAuth from '../middleware/authMilddleware.js';
import multer, { MulterError } from 'multer';
import DocumentsUp from '../models/documents.js';
import path from 'node:path';
import * as fs from 'node:fs'

import { 
    expedientes,
    registrarExpediente,
    expedientePv,
    almacenarArchivos,
    consultarDocumentosPv,
    saveNewFolder,
    saveNewData,
    saveTable,
    consultarTabla,
    createNewTable,
    opendFile
} from '../controllers/appController.js';

const __dirname = new URL(import.meta.url).pathname.substring(1)
const __pathDocuments = path.join(__dirname, '../../', 'documents')

const storage = multer.diskStorage({
    destination: async function(req,file,callback){
        const folder = await DocumentsUp.findOne({where:{id: req.params.folder}})
        const mainPath = `${__pathDocuments}/${folder.document_owner}`
        // Carpeta "Tablas" exclusiva
        if(folder.name === 'tablas')return callback(new MulterError())

        if(folder.document_owner === folder.location_folderId){
            req.body.folderPath = mainPath
            callback(null, mainPath)
        }else{
            req.body.folderPath = (location_path(mainPath))
            function location_path(path, location = ''){
                const directory = fs.readdirSync(path)
                
                for(let i = 0; i < directory.length; i++){

                    if(directory[i] === folder.location_path){
                        return `${path}/${folder.location_path}`
                    }
                    if(directory){
                        const stat = fs.statSync(`${path}/${directory[i]}`)
                        if(stat.isDirectory()){
                            const result = location_path(`${path}/${directory[i]}`,location)
                            if(result){
                                return result
                            }
                        }
                    }
                }
                return location
            }
            callback(null, req.body.folderPath)
        }
    },
    filename: function(req, file, callback) {

        if(fs.existsSync(`${req.body.folderPath}/${file.originalname}`)){

            const onlyExtension = path.extname(file.originalname)
            const onlyName = path.basename(file.originalname, onlyExtension)
            let copy = 1
            let newName = `${onlyName}(${copy})${onlyExtension}`
            
            while(fs.existsSync(`${req.body.folderPath}/${newName}`)){
                copy++
                newName = `${onlyName}(${copy})${onlyExtension}`
            }
            callback(null, newName);
        }else{
            callback(null, file.originalname)
        }
    }
});
const upload = multer({
    storage: storage,
    limits: {
        // Configuración de límites
        files: 10, // Límite de 2 archivos
      }
})

const router = express.Router()

// Consultar Expedientes
router.post('/',chackAuth ,expedientes)
// Registrar Expediente Nuevo
router.post('/registrarExpediente',chackAuth, registrarExpediente)
// Consultar Expediente Privado
router.post('/expedientePv',chackAuth, expedientePv)
// Consultar los documentos del directorio consultado (folder)
router.post('/consultarDocumentosPv/:folderId',chackAuth, consultarDocumentosPv)
// Consultar el archivo seleccionado
router.post('/opendFile',chackAuth, opendFile)
// Almacenar archivos
router.post('/almacenarArchivos/:folder',chackAuth, upload.array('files', 10), almacenarArchivos);
// Crear nueva carpeta
router.post('/saveNewFolder',chackAuth, saveNewFolder)
// Guardar la nueva informacion de un expediente privado
router.post('/saveNewData',chackAuth, saveNewData)
// Crear nueva tabla
router.post('/createNewTable',chackAuth, createNewTable)
// Guardar cambios de tabla
router.post('/saveTable',chackAuth, saveTable)
// Consultar tabla seleccionada
router.post('/consultarTabla',chackAuth, consultarTabla)

export default router