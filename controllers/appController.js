import { Storage } from "@google-cloud/storage"
import Expedientes from "../models/expediente.js"
import DocumentsUp from "../models/documents.js"
import generarId from "../helpers/generarID.js"
import mercadopago from 'mercadopago'

const storage = new Storage({
    projectId: process.env.GCP_STORAGE_PROJECTID,
    keyFilename:process.env.GCP_STORAGE_KEYFILENAME 
})
const bucket = storage.bucket(process.env.GCP_STORAGE_BUCKETNAME)

const expedientes = async (req, res) =>{
    //Verificar si se autentico el usuario correctamente checkAuth
    if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado,Vuevla a iniciar sesion'})
    try{
        //Enviar Los expedientes correspondientes
        const expedientes = await Expedientes.findAll({attributes: ['document','name','last_name']})
        res.json({expedientes})
    }catch(error){
        res.status(404).json({msg: 'Hubo Un Error'})
    }
}

const registrarExpediente = async (req, res) => {
    //Verificar si se autentico el usuario correctamente desde checkAuth
    if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    try{
        // Verificar si el Documento ya esta reistrado
        const expedienteExiste = await Expedientes.findOne({where:{document:req.body.document}})
        if(expedienteExiste){
            return res.status(404).json({msg: `Expediente de ${expedienteExiste.last_name} ya existe`})
        }
        // Creamos el expediente con la informacion recibida 
        const newExpediente = await Expedientes.create(req.body)
        // Cramos el directorio el principal unico
        await DocumentsUp.create({
            id: newExpediente.id,
            document_owner: newExpediente.document,
            name: newExpediente.document,
            uploadedby: req.usuario.document,
            type: 0,
            mimetype: 'folder',
            location_folderId: newExpediente.document,
            location_path: `documents/${newExpediente.document}`,
        })
        // Cramos el directorio de tablas unico 
        await DocumentsUp.create({
            id: generarId(),
            document_owner: newExpediente.document,
            name: 'tablas',
            uploadedby: req.usuario.document,
            type: 0,
            mimetype: 'folder',
            location_folderId: newExpediente.id,
            location_path: `documents/${newExpediente.document}/tablas`,
        })

        return res.status(200).json({msg: `Registrado Correctamente`})
    }catch(err){
        return res.status(404).json({msg: `Hubo un error`})
    }
}

const expedientePv = async (req, res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    const {document} = req.body

    try{
        // Buscamos el expediente por su documento unico
        const expediente = await Expedientes.findOne({where: {document}})
        return res.status(200).json(expediente)
    }catch(error){
        return res.status(400).json({msg: 'Solicitud Rechazada'})
    }
}

const consultarDocumentosPv = async (req,res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})
    // Consultamos al propietario en los parametros recibidos
    const folderId = req.params.folderId
    try{
        // Recuperamos todos los documentos que estan registrados en el directorio proporsionado
        const folder = await DocumentsUp.findOne({where: {id: folderId}})
        // Consultamos y ordenar los documentos (carpetas arriba, archivos abajo)
        const documents = await DocumentsUp.findAll({
            where: {location_folderId: folder.id},
            order: [['type', 'ASC'], ['name', 'ASC']] 
        })
        // Consultamos las tablas
        const tables = await DocumentsUp.findAll({
            where: {document_owner: folder.document_owner, type: 2}
        })
        // Creamos un objeto con toda la informacion necesaria
        const dataObj = {
            folderId,
            documents,
            tables
        }
        return res.status(200).json(dataObj)
    }catch(err){
        console.log(err)
        return res.status(404).json({msg: 'No se Encontro Directorio'})
    }
}

const almacenarArchivos =  async (req, res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})
    // Colocamos en una variable los archivos
    const filesUp = req.files
    // Verificamos si la variable no es nula
    if(!filesUp) return res.status(404).json({msg: 'Hubo un Error'})
    // Guardamos los archivos
    try{
        // Consultamos el directorio donde se guardara con su ID
        const folder = await DocumentsUp.findByPk(req.params.folder)
        // Manejamos la subida del archivo
        const uploadFiles = async (file) =>{
            try{
                // Cremos un objeto con la informacion y lo subimos a la base de datos
                const newDocument = {
                    id: generarId(),
                    document_owner: folder.document_owner,
                    name: file.originalname,
                    uploadedby: req.usuario.document,
                    type: 1,
                    mimetype: file.mimetype,
                    location_folderId: folder.id,
                    location_path: `${folder.location_path}/${file.originalname}`
                }
                await DocumentsUp.create(newDocument)
                // Retornamos una prmesa que se resolvera al terminar el proceso de escritura
                return new Promise(async (resolve, reject) => {
                    // Ruta (path) de referencia del archivo + nombre del archivo
                    const fileUP = bucket.file(`${folder.location_path}/${file.originalname}`)
                    // Subimos el archivo colocando su mimetype
                    const stream = fileUP.createWriteStream({
                        metadata: {
                            contentType: file.mimetype,
                            metadata: {
                                custom: 'metadata'
                            }
                        },
                        resumable: false // Para archivos de menos de 10 mb
                    })
                    .end(file.buffer) // Subimos el contenido
                    .on('error', (err) => reject(err))
                    .on('finish', () => {
                        resolve('Upload Success')
                    }) 
                })
            }catch(err){
                throw new Error('Error al subir el archivo')
            }
        }
        // Creamos un arreglo con una funcion por cada archivo recibido 
        const uploadPromise = await filesUp.map(uploadFiles)
        // esperamos a que las promesas se completen
        await Promise.all(uploadPromise)

        return res.status(200).json({msg: 'Archivos Subidos correctamente'})
    }catch(err){
        console.log(err)
        return res.status(404).json({msg: 'Hubo un error'})
    }
}
// Buscador de archivos
const opendFile = async (req,res) => {
    //Verificar si se autentico el usuario correctamente desde checkAuth
    if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    const {idFile} = (req.body)

    try{
        // Buscamos el archivo
        const fileDB = await DocumentsUp.findByPk(idFile)
        // Buscamos el directorio donde se guarda el archivo
        const file = bucket.file(fileDB.location_path)
        // Verificamos si el archivo existe
        const [exists] = await file.exists();
        if (!exists)return res.status(404).json({msg: 'No se encontro el archivo'});
        // Enviamos la informacion al cliente
        const stream = file.createReadStream().pipe(res)
        stream.on('error',(err) => {
            console.log(err)
            return res.status(404).json({msg: 'No se pudo leer el archivo'}) 
        })
        stream.on('end',() => res.end())
    }catch(err){
        console.log(err)
        return res.status(404).json({msg: 'Hubo un error'});
    }
}

const saveNewFolder = async (req, res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    const { newFolderName, saveInFolder } = req.body

    try{
        // Consultamos el directorio padre del nuevo directorio
        const folderFather = await DocumentsUp.findByPk(saveInFolder)
        // Creamos la referencia del directorio en la base de datos
        await DocumentsUp.create({
            id: generarId(),
            document_owner: folderFather.document_owner,
            name: newFolderName,
            uploadedby: req.usuario.document,
            type: 0,
            mimetype: 'folder',
            location_folderId: folderFather.id,
            location_path: `${folderFather.location_path}/${newFolderName}`
        })
        return res.status(200).json({msg: 'Agregando...'})
    }catch(err){
        console.log(err)
        return res.status(404).json({msg: 'Hubo un error'})
    }
}
// Verificar el cambio de documento
const saveNewData = async (req, res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    // Obtenemos la nueva infromacion a actualizar
    const newData = req.body

    try{
        
        // Confirmamos el expediente
        const expediente = await Expedientes.findByPk(newData.id)
        // Lo editamos con la informacion proporcionada (newData)
        await Expedientes.update(newData,{
            where:{id: expediente.id}
        })

        // Enviamos la informacion nueva al cliente en caso de ser actualizado 
        res.status(200).json(newData)
    }catch(err){
        res.status(404).json({msg: 'Hubo un error'})
    }
}

const createNewTable = async (req, res) =>{
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    const {name, saveInFolder, newTable} = req.body
    
    try{
        const folderFather = await DocumentsUp.findOne({
            where:{
                name: 'tablas',
                location_folderId: saveInFolder
            }
        })
        // Creamos la referencia 
        await DocumentsUp.create({
            id: generarId(),
            document_owner: folderFather.document_owner,
            name,
            uploadedby: req.usuario.document,
            type: 2,
            mimetype: 'text/plain',
            location_folderId: folderFather.id,
            location_path: `${folderFather.location_path}/${name}.txt`
        })
        // Creamos el objeto en la nube
        const file = bucket.file(`${folderFather.location_path}/${name}.txt`)
        // Creamos la tabla
        const stream = file.createWriteStream({
            metadata: {
              contentType: 'text/plain',
              metadata: {
                custom: 'metadata',
              },
            },
        }).end(newTable);
  
        await new Promise((resolve, reject) => {
            stream.on('error', (err) => {
                console.error('Error en el stream:', err);
                reject(err);
            })
            stream.on('finish', () => {
                resolve();
            });
        });
        
        return res.status(200).json({msg: 'Tabla Creada'})
    }catch(err){
        console.log(err)
        return res.status(404).json({msg: 'Hubo un error'})
    }
}

const consultarTabla = async (req, res) => {
     //Verificar si se autentico el usuario correctamente desde checkAuth
     if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado - Vuevla a iniciar secion'})

    const {id} = (req.body)
    // Consultamos tabla por su ID
    const table = await DocumentsUp.findByPk(id)

    try{
        // Buscamos la tabla por su referencia de la URL 
        const file = bucket.file(table.location_path)
        // Leemos el archivo y lo mandamos al cliente
        const stream = file.createReadStream().pipe(res)
        stream.on('error', ()=> {
            return res.status(404).json({msg: 'No se encontro el archivo'}) 
        })
        stream.on('end', ()=> res.end())
    }catch(err){
        return res.status(404).json({msg: err})
    }
}

const saveTable = async (req, res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})
    
    const table = await DocumentsUp.findByPk(req.body.id)
    const newInfo = req.body.table

    try {
        const file = bucket.file(table.location_path);

        const stream = file.createWriteStream({
          metadata: {
            contentType: 'text/plain',
            metadata: {
              custom: 'metadata',
            },
          },
        }).end(newInfo);

        await new Promise((resolve, reject) => {
            stream.on('error', (err) => {
                console.error('Error en el stream:', err);
                reject(err);
            })
            stream.on('finish', () => {
                resolve();
            });
        });

        return res.status(200).json({ msg: 'Guardado correctamente' });
      } catch (err) {
        return res.status(404).json({ msg: 'Hubo un error' });
      }

    // try{
    //     fs.writeFileSync(`${__pathDocuments}/${table.document_owner}/tablas/${table.name}`, newInfo, 'utf-8')

    //     res.status(200).json({msg: 'Guardado Correctamente'})
    // }catch(error){
    //     res.status(404).json({msg: 'Hubo un error'})
    // }
}

const createOrder = async (req, res) => {
    const itms = req.body.items

    mercadopago.configure({
        access_token: process.env.ACCESS_TOKEN_MP
    })

    const preference = {
        items: itms,
        back_urls: {
            success: 'http://localhost:5173/admin/success',
            failure: 'http://localhost:5173/admin/success',
            pending: 'http://localhost:5173/admin/success'
        },
        installments: 6,
        statement_descriptor: "MINEGOCIO",
        external_reference: "Reference_1234",
        purpose: 'wallet_purchase',
        auto_return: "approved",
        // notification_url: 'https://86e3-2800-a4-2764-5900-fdbf-89cb-ebb1-2c79.ngrok.io/notificacion'
    }

    const result = await mercadopago.preferences.create(preference)
    res.json(result.body.id)
}

export {
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
    opendFile,
    createOrder
}
