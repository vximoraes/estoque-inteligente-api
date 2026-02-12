import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import getSwaggerOptions from "../docs/config/head.js";
import logRoutes from "../middlewares/LogRoutesMiddleware.js";
import auth from './authRoutes.js';
import usuarios from './usuarioRoutes.js';
import categorias from './categoriaRoutes.js';
import localizacoes from './localizacaoRoutes.js';
import componentes from './componenteRoutes.js';
import estoques from './estoqueRoutes.js';
import fornecedores from './fornecedorRoutes.js';
import movimentacoes from './movimentacaoRoutes.js';
import notificacoes from './notificacaoRoutes.js';
import orcamentos from './orcamentoRoutes.js'
import grupos from './grupoRoutes.js'
import rotas from './rotaRoutes.js'

import dotenv from "dotenv";

dotenv.config();

const routes = (app) => {
    if (process.env.DEBUGLOG) {
        app.use(logRoutes);
    };

    app.get("/", (req, res) => {
        res.redirect("/docs");
    });

    const swaggerDocs = swaggerJsDoc(getSwaggerOptions());
    app.use(swaggerUI.serve);
    app.get("/docs", (req, res, next) => {
        swaggerUI.setup(swaggerDocs)(req, res, next);
    });

    app.use(express.json(),
        auth,
        usuarios,
        categorias,
        localizacoes,
        componentes,
        estoques,
        fornecedores,
        movimentacoes,
        notificacoes,
        orcamentos,
        grupos,
        rotas
    );

    app.use((req, res) => {
        res.status(404).json({ message: "Rota não encontrada" });
    });
};

export default routes;