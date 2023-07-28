import Expedientes from "../models/expediente.js"
import DocumentsUp from "../models/documents.js"
import generarId from "../helpers/generarID.js"
import path from "path"
import fs from 'fs'

const __dirname = new URL(import.meta.url).pathname.substring(1)
const __pathDocuments = path.join(__dirname, '../../', 'documents')

const expedientes = async (req, res) =>{
    //Verificar si se paso el usuario correctamente desde checkAuth
    if(!req.usuario) return res.status(404).json({msg: 'Usuario No Autenticado'})

    try{
        //Enviar Los expedientes correspondientes
        const expedientes = await Expedientes.findAll({attributes: ['document','name','last_name']})
        res.json({expedientes})
    }catch(error){
        res.status(404).json({msg: 'Hubo Un Error'})
    }
}

const registrarExpediente = async (req, res) => {
    //Verificar si se paso el usuario correctamente desde checkAuth
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error'})
    // Verificar si el Documento ya esta reistrado
    const expedienteExiste = await Expedientes.findOne({where:{document:req.body.document}})
    if(expedienteExiste){
        return res.status(404).json({msg: `Expediente de ${expedienteExiste.last_name} ya existe`})
    }
    try{
        // Crear carpeta personal del expediente creado
        
        // Registrar Expediente
        const newExpediente = await Expedientes.create(req.body)

        await DocumentsUp.create({
            id: newExpediente.id,
            document_owner: newExpediente.document,
            name: newExpediente.document,
            uploadedby: req.usuario.document,
            type: 0,
            mimetype: 'folder',
            location_folderId: newExpediente.document,
            location_path: newExpediente.document,
        })

        await DocumentsUp.create({
            id: generarId(),
            document_owner: newExpediente.document,
            name: 'tablas',
            uploadedby: req.usuario.document,
            type: 0,
            mimetype: 'folder',
            location_folderId: newExpediente.id,
            location_path: `tablas.${newExpediente.id}`,
        })

        fs.mkdirSync(`${__pathDocuments}/${newExpediente.document}`)
        fs.mkdirSync(`${__pathDocuments}/${newExpediente.document}/tablas`)

        res.status(200).json({msg: 'Expediente Creado Correctamente'})
    }catch(error){
        console.log(error)
        res.status(404).json({msg: 'Hubo un error al intentar registrar'})
    }
}

const expedientePv = async (req, res) => {
    if(!req.usuario) return res.status(400).json({msg: 'Hubo un error'})

    const {document} = req.body

    try{
        const expediente = await Expedientes.findOne({where: {document}})
        res.status(200).json(expediente)
    }catch(error){
        res.status(400).json({msg: 'Solicitud Rechazada'})
    }
}

const consultarDocumentosPv = async (req,res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})
    // Consultamos al propietario en los parametros recibidos
    const folderId = req.params.folderId
    try{
        // Recuperamos todos los documentos que estan registrados en el directorio proporsionado
        const folder = await DocumentsUp.findOne({where: {id: folderId}})

        const documents = await DocumentsUp.findAll({
            where: {location_folderId: folder.id},
            // Ordenar los documentos (carpetas arriba, archivos abajo)
            order: [['type', 'ASC'], ['name', 'ASC']]
        })

        const tables = await DocumentsUp.findAll({
            where: {document_owner: folder.document_owner, type: 2},
        })

        const dataObj = {
            folderId,
            path: folder.location_path,
            documents,
            tables
        }

        res.status(200).json(dataObj)
    }catch(error){
        res.status(404).json({msg: 'No se Encontro Directorio'})
    }
}

const almacenarArchivos =  async (req, res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})
    
    const files = req.files
    // Sistema de verificacion
    if(!files) return res.status(404).json({msg: 'Hubo un Error'})
    if(!req.usuario) return res.status(400).json({msg: 'Usuario Invalido, Intente iniciar sesion nuevamente'})
    try{
        // Iteramos sobre los archivos enviados y los guardamos uno x uno con (Nombre del archivo) + (Identificacion del propietario) + (Identificacion de quien suba el archivo).
        await files.forEach(async element => {
                await DocumentsUp.create({
                id: generarId(), 
                name: element.filename ,
                document_owner: req.body.files,
                uploadedby: req.usuario.document,
                type: 1,
                mimetype: element.mimetype,
                location_folderId: req.params.folder,
                })
        });
        res.status(200).json({msg: 'Archivos Guardados Correctamente'})
    }catch(error){
        res.status(404).json({msg: `A Ocurrido Un Error`})
    }
}
// Buscador de archivos
const opendFile = async (req,res) => {
    
    try{        
        const {idFile} = (req.body)

        // Buscamos el archivo
        const file = await DocumentsUp.findByPk(idFile)
        // Buscamos el directorio donde se guarda el archivo
        const folderFather = await DocumentsUp.findByPk(file.location_folderId)
        // Armamos el path principal
        const mainPath = `${__pathDocuments}/${folderFather.document_owner}`
    
        if(!file || !folderFather)return res.status(404).json({msg: 'Hubo un error'})

        if(folderFather.document_owner === folderFather.location_folderId){
            // Si el archivo se encuentra en el directorio principal se arma el path correspondiente            
            const fileContent = `${mainPath}/${file.name}`
            // Leemosa el archivo y lo mandamos al cliente
            if(!fs.existsSync(fileContent)) return res.status(404).json({msg: 'Archivo no existe'})

            const fileStream = fs.createReadStream(fileContent);
            fileStream.pipe(res);
        }
        else{
            // Funcion para buscar el path completo del directorio padre donde se guardara el documento buscado
            function location_path(path, location = undefined){
                // Consulta todos los archivos del directorio principal
                const directory = fs.readdirSync(path)
                // Se itera en cada uno
                for(let i = 0; i < directory.length; i++){
                    // En caso de encontrar el directorio correcto se retorna el path + el directorio donde se encuentra el archivo
                    if(directory[i] === folderFather.location_path ){
                        return  `${path}/${directory[i]}`
                    } 
                    // Se verifica si el directorio no esta vacio
                    if(directory[i]){
                        const stat = fs.statSync(`${path}/${directory[i]}`)
                        // En caso de que se encuentre un directorio se volvera a llamar la funcion
                        if(stat.isDirectory()){
                            const result = location_path(`${path}/${directory[i]}`, location)
                            // Si se encontro el directorio padre donde se encuentra el archivo se retornara el resultado, si no se encuentra se seguira iterando en los demas directorios.
                            if(result){
                                return result
                            }
                        }
                    }
                }
                // Por ultimo retornamos location con el path completo donde guardaremos el nuevo directorio
                return location
            }
            // Consegiomos el path completo y le sumamos el nombre del archivo el cual es unico
            const fileContent = location_path(mainPath) + '/' + file.name

            if(!fs.existsSync(fileContent)) return res.status(404).json({msg: 'Archivo no existe'})

            const fileStream = fs.createReadStream(fileContent);
            fileStream.pipe(res);
        }
    }catch(error){
        res.status(400).json({msg: 'Hubo un error'})
    }
}

const saveNewFolder = async (req, res) => {

    try{

        if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})

        const { saveInFolder } = req.body
        
        let newFolderName = req.body.newFolderName
        // Consultamos el directorio padre
        const folderFather = await DocumentsUp.findByPk(saveInFolder)
        // Path del directorio principal
        const mainPath = `${__pathDocuments}/${folderFather.document_owner}`
        // Verificamos si ya existe un directorio con ese nombre
        const existe = await DocumentsUp.findOne({
            where:{
                name: newFolderName,
                location_folderId: folderFather.id
            }})
        // En caso de que existe un directorio con nombre similar se manda error
        if(existe) return res.status(404).json({msg: 'Nombre de directorio registrado'})
        // Si se intenta guardar en el directorio principal...
        if(folderFather.document_owner === folderFather.location_folderId){ 
            // En caso de que no existe se crea en la DB y luego se crea el directorio. Al directorio se le agregara un id unico, que se agregara al nombre del mismo en Disco y al location_path en DB "(nombre.id)". 
            const id = generarId()
            await DocumentsUp.create({
                id,
                document_owner: folderFather.document_owner,
                name: newFolderName,
                uploadedby: req.usuario.document,
                type: 0,
                mimetype: 'folder',
                location_folderId: folderFather.id,
                location_path: `${newFolderName}.${id}`
            })
            // Agregar el directori oen memoria con nombre + id
            fs.mkdirSync(`${mainPath}/${newFolderName}.${id}`)
        }else{
            // Funcion para buscar el path completo del directorio padre donde se guardara el nuevo directorio
            function location_path(path, location = undefined){
                // Consulta todos los archivos del directorio
                const directory = fs.readdirSync(path)
                // Se itera en cada uno
                for(let i = 0; i < directory.length; i++){
                    // En caso de encontrar el directorio correcto se retorna el path + el nuevo directorio
                    if(directory[i] === folderFather.location_path ){
                        return  `${path}/${directory[i]}`
                    } 
                    // Se verifica si el directorio no esta vacio
                    if(directory[i]){
                        const stat = fs.statSync(`${path}/${directory[i]}`)
                        // En caso de que se encuentre un directorio se volvera a llamar la funcion
                        if(stat.isDirectory()){
                            const result = location_path(`${path}/${directory[i]}`, location)
                            // Si se encontro el directorio padre donde se guardara el nuevo directorio se retornara el resultado, si no se encuentra se seguira iterando en los demas directorios.
                            if(result){
                                return result
                            }
                        }
                    }
                }
                // Por ultimo retornamos location con el path completo donde guardaremos el nuevo directorio
                return location
            }

            const locationFolder = location_path(mainPath)
            const id = generarId()

            await DocumentsUp.create({
                id,
                document_owner: folderFather.document_owner,
                name: newFolderName,
                uploadedby: req.usuario.document,
                type: 0,
                mimetype: 'folder',
                location_folderId: folderFather.id,
                location_path: `${newFolderName}.${id}`
            })

            fs.mkdirSync(`${locationFolder}/${newFolderName}.${id}`)
        }
        return res.status(200).json({msg: 'Guardado correctamente '})
    }catch(error){
        return res.status(200).json({msg: 'Hubo un error'})
    }
}
// Verificar el cambio de documento
const saveNewData = async (req, res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})
    // Datos nuevos a actualizar
    const newData = req.body
    try{
        // En caso de que el documento ya este registrado devolvemos un error
        const documentRepete = await Expedientes.findOne({
            where:{document: newData.document}
        })
        if(documentRepete) return res.status(404).json({msg: 'El documento ya esta ocupado'})

        // Confirmamos el expediente
        const expediente = await Expedientes.findByPk(newData.id)
        // Lo editamos con la informacion proporcionada (newData)
        await Expedientes.update(newData,{
            where:{id: expediente.id}
        })
       
        // if(parseInt(newData.document) !== expediente.document ){


        //     await DocumentsUp.update(
        //         {
        //         document_owner:newData.document,
        //         name: newData.document,
        //         location_folderId:newData.document,
        //         location_path: newData.document
        //         },
        //         {where: {name: `${expediente.document}`}}
        //     )
        //     await DocumentsUp.update(
        //         {document_owner: newData.document},
        //         {where: {document_owner: expediente.document}}
        //     )
        //     const oldPath = `${__pathDocuments}/${expediente.document}`
        //     fs.renameSync(oldPath, `${__pathDocuments}/${newData.document}`)
        
        // }

        // Enviamos la informacion nueva al cliente en caso de ser actualizado 
        
        
        res.status(200).json(newData)
    }catch(error){
        console.log(error)
        res.status(404).json({msg: 'Hubo un error'})
    }
}

const createNewTable = async (req, res) =>{
    const {name, saveInFolder} = req.body
    const newTable = JSON.stringify(req.body.newTable)
    
    try{
        const folderFather = await DocumentsUp.findOne({where:{location_path: `tablas.${saveInFolder}`}})

        if(fs.existsSync((`${__pathDocuments}/${folderFather.document_owner}/tablas/${name}.txt`))){
            res.status(404).json({msg: 'El nombre del archivo ya existe'})
            return
        }

        await DocumentsUp.create({
                id: generarId(),
                document_owner: folderFather.document_owner,
                name: `${name}.txt`,
                uploadedby: req.usuario.document,
                type: 2,
                mimetype: 'text/plain',
                location_folderId: folderFather.id,
                location_path: `${name}.txt`
        })

        fs.writeFileSync(`${__pathDocuments}/${folderFather.document_owner}/tablas/${name}.txt`, newTable, 'utf-8')

        res.status(200).json({msg: 'Creado Correctamente'})
    }catch(error){
        res.status(500).json({msg: 'Hubo un error'})
    }
}

const consultarTabla = async (req, res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})

    const {id} = (req.body)
    const table = await DocumentsUp.findByPk(id)
    try{
        const file = path.join(__pathDocuments, `/${table.document_owner}/tablas/${table.name}`)
        const content = fs.readFileSync(file, {encoding: 'utf-8'})
        const text = JSON.parse(content)
        res.status(200).json(text)
    }catch(error){
        res.status(404).json({msg: 'Hubo un error'})
    }
}

const saveTable = async (req, res) => {
    if(!req.usuario) return res.status(404).json({msg: 'Hubo un error, Vuelva a inisiar sesion'})
    
    const table = await DocumentsUp.findByPk(req.body.id)
    const newInfo = JSON.stringify(req.body.table)
    try{
        fs.writeFileSync(`${__pathDocuments}/${table.document_owner}/tablas/${table.name}`, newInfo, 'utf-8')

        res.status(200).json({msg: 'Guardado Correctamente'})
    }catch(error){
        res.status(404).json({msg: 'Hubo un error'})
    }
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
    opendFile
}
