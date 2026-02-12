import express from "express";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import AuthPermission from "../middlewares/AuthPermission.js";
import UsuarioController from '../controllers/UsuarioController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import upload from "../config/MulterConfig.js";

const router = express.Router();

const usuarioController = new UsuarioController();

router
    .get("/usuarios", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.listar.bind(usuarioController)))
    .get("/usuarios/:id", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.listar.bind(usuarioController)))
    .post("/usuarios", asyncWrapper(usuarioController.criar.bind(usuarioController)))
    .post("/usuarios/convidar", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.convidarUsuario.bind(usuarioController)))
    .post("/usuarios/:id/reenviar-convite", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.reenviarConvite.bind(usuarioController)))
    .put("/usuarios/:id/foto", AuthMiddleware, AuthPermission, upload.single('file'), asyncWrapper(usuarioController.uploadFoto.bind(usuarioController)))
    .patch("/usuarios/:id", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.atualizar.bind(usuarioController)))
    .put("/usuarios/:id", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.atualizar.bind(usuarioController)))
    .delete("/usuarios/:id", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.deletar.bind(usuarioController)))
    .delete("/usuarios/:id/foto", AuthMiddleware, AuthPermission, asyncWrapper(usuarioController.deletarFoto.bind(usuarioController)))

export default router;