import express from "express";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import AuthPermission from "../middlewares/AuthPermission.js";
import CategoriaController from '../controllers/CategoriaController.js';
import { asyncWrapper } from '../utils/helpers/index.js';

const router = express.Router();

const categoriaController = new CategoriaController(); 

router
    .get("/categorias", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.listar.bind(categoriaController)))
    .get("/categorias/:id", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.listar.bind(categoriaController)))
    .post("/categorias", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.criar.bind(categoriaController)))
    .patch("/categorias/:id", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.atualizar.bind(categoriaController)))
    .patch("/categorias/:id/inativar", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.inativar.bind(categoriaController)))
    .put("/categorias/:id", AuthMiddleware, AuthPermission, asyncWrapper(categoriaController.atualizar.bind(categoriaController)))

export default router;