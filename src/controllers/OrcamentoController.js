import OrcamentoService from '../services/OrcamentoService.js';
import { OrcamentoQuerySchema, OrcamentoIdSchema } from '../utils/validators/schemas/zod/querys/OrcamentoQuerySchema.js';
import { OrcamentoSchema, OrcamentoUpdateSchema, ComponenteOrcamentoSchema, ComponenteOrcamentoUpdateSchema } from '../utils/validators/schemas/zod/OrcamentoSchema.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import mongoose from 'mongoose';
import Componente from '../models/Componente.js';
import Fornecedor from '../models/Fornecedor.js';

class OrcamentoController {
    constructor() {
        this.service = new OrcamentoService();
    };

    async criar(req, res) {
        const parsedData = OrcamentoSchema.parse(req.body);

        const componentesProcessados = [];
        for (const comp of parsedData.componentes) {
            const componente = await Componente.findById(comp.componente);
            if (!componente) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'componente',
                    details: [{ path: 'componente', message: `Componente com ID ${comp.componente} não encontrado.` }],
                    customMessage: `Componente com ID ${comp.componente} não encontrado.`
                });
            }

            const fornecedor = await Fornecedor.findById(comp.fornecedor);
            if (!fornecedor) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'fornecedor',
                    details: [{ path: 'fornecedor', message: `Fornecedor com ID ${comp.fornecedor} não encontrado.` }],
                    customMessage: `Fornecedor com ID ${comp.fornecedor} não encontrado.`
                });
            }

            componentesProcessados.push({
                componente: comp.componente,
                nome: componente.nome, 
                fornecedor: comp.fornecedor,
                quantidade: comp.quantidade,
                valor_unitario: comp.valor_unitario
            });
        }

        const orcamentoParaSalvar = {
            nome: parsedData.nome,
            descricao: parsedData.descricao,
            componentes: componentesProcessados
        };

        let data = await this.service.criar(orcamentoParaSalvar, req);
        let orcamentoLimpo = data.toObject();

        return CommonResponse.created(res, orcamentoLimpo);
    };

    async listar(req, res) {
        const { id } = req.params || {};
        if (id) {
            OrcamentoIdSchema.parse(id);
        };

        const query = req.query || {};
        if (Object.keys(query).length !== 0) {
            await OrcamentoQuerySchema.parseAsync(query);
        };

        const data = await this.service.listar(req);

        return CommonResponse.success(res, data);
    };

    async atualizar(req, res) {
        const { id } = req.params;

        const parsedData = OrcamentoUpdateSchema.parse(req.body);
        const orcamentoAtualizado = await this.service.atualizar(id, parsedData, req);

        return CommonResponse.success(res, orcamentoAtualizado, 200, 'Orçamento atualizado com sucesso.');
    };

    async deletar(req, res) {
        const { id } = req.params || {};
        OrcamentoIdSchema.parse(id);
        const data = await this.service.deletar(id, req);
        return CommonResponse.success(res, data, 200, 'Orçamento excluído com sucesso.');
    };

    async inativar(req, res) {
        const { id } = req.params || {};
        OrcamentoIdSchema.parse(id);

        const data = await this.service.inativar(id, req);

        return CommonResponse.success(res, data, 200, 'Orçamento inativado com sucesso.');
    };

    // Manipular componentes.

    async adicionarComponente(req, res) {
        const { orcamentoId } = req.params;
        const componenteData = req.body;
        const parsedComponente = ComponenteOrcamentoSchema.parse(componenteData);

        const componente = await Componente.findById(parsedComponente.componente);
        if (!componente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'componente',
                details: [{ path: 'componente', message: `Componente com ID ${parsedComponente.componente} não encontrado.` }],
                customMessage: `Componente com ID ${parsedComponente.componente} não encontrado.`
            });
        }

        const fornecedor = await Fornecedor.findById(parsedComponente.fornecedor);
        if (!fornecedor) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'fornecedor',
                details: [{ path: 'fornecedor', message: `Fornecedor com ID ${parsedComponente.fornecedor} não encontrado.` }],
                customMessage: `Fornecedor com ID ${parsedComponente.fornecedor} não encontrado.`
            });
        }

        const novoComponente = {
            componente: parsedComponente.componente,
            nome: componente.nome, 
            fornecedor: parsedComponente.fornecedor,
            quantidade: parsedComponente.quantidade,
            valor_unitario: parsedComponente.valor_unitario
        };

        const orcamentoAtualizado = await this.service.adicionarComponente(orcamentoId, novoComponente, req);
        return CommonResponse.success(res, orcamentoAtualizado, 200, 'Componente adicionado com sucesso.');
    };

    async atualizarComponente(req, res) {
        const { orcamentoId, id } = req.params;
        const componenteData = req.body;
        if (!componenteData || Object.keys(componenteData).length === 0) {
            return CommonResponse.error(res, 400, 'validationError', 'componente', [{ message: 'Nenhum campo enviado para atualização.' }]);
        };
        const parsedComponente = ComponenteOrcamentoUpdateSchema.parse(componenteData);

        // Buscar valores antigos para garantir atualização correta
        const oldComponente = await this.service.getComponenteById(orcamentoId, id, req);
        if (!oldComponente) {
            return CommonResponse.error(res, 404, 'resourceNotFound', 'componente', [{ message: 'Componente não encontrado.' }]);
        };

        if (parsedComponente.fornecedor && parsedComponente.fornecedor !== oldComponente.fornecedor.toString()) {
            const fornecedor = await Fornecedor.findById(parsedComponente.fornecedor);
            if (!fornecedor) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'fornecedor',
                    details: [{ path: 'fornecedor', message: `Fornecedor com ID ${parsedComponente.fornecedor} não encontrado.` }],
                    customMessage: `Fornecedor com ID ${parsedComponente.fornecedor} não encontrado.`
                });
            }
        }

        // Atualiza apenas os campos enviados
        const componenteAtualizado = {
            ...oldComponente,
            ...parsedComponente,
            _id: id
        };

        const orcamentoAtualizado = await this.service.atualizarComponente(orcamentoId, id, componenteAtualizado, req);
        return CommonResponse.success(res, orcamentoAtualizado, 200, 'Componente atualizado com sucesso.');
    };

    async removerComponente(req, res) {
        const { orcamentoId, id } = req.params;
        const orcamentoAtualizado = await this.service.removerComponente(orcamentoId, id, req);
        return CommonResponse.success(res, orcamentoAtualizado, 200, 'Componente removido com sucesso.');
    };
};

export default OrcamentoController;