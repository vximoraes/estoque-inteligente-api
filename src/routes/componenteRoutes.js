import express from "express";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import AuthPermission from "../middlewares/AuthPermission.js";
import ComponenteController from '../controllers/ComponenteController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import upload from '../config/MulterConfig.js'

const router = express.Router();

const componenteController = new ComponenteController(); 

router
    .get("/componentes", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.listar.bind(componenteController)))
    .get("/componentes/:id", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.listar.bind(componenteController)))
    .post("/componentes", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.criar.bind(componenteController)))
    .patch("/componentes/:id", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.atualizar.bind(componenteController)))
    .patch("/componentes/:id/inativar", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.inativar.bind(componenteController)))
    .put("/componentes/:id", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.atualizar.bind(componenteController)))
    .post("/componentes/:id/foto", AuthMiddleware, AuthPermission, upload.single('file'), asyncWrapper(componenteController.uploadFoto.bind(componenteController)))
    .delete("/componentes/:id/foto", AuthMiddleware, AuthPermission, asyncWrapper(componenteController.deletarFoto.bind(componenteController)))

export default router;