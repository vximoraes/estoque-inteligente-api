import GrupoController from '../../../controllers/GrupoController.js';
import GrupoService from '../../../services/GrupoService.js';
import { GrupoSchema, GrupoUpdateSchema } from '../../../utils/validators/schemas/zod/GrupoSchema.js';
import { GrupoQuerySchema, GrupoIdSchema } from '../../../utils/validators/schemas/zod/querys/GrupoQuerySchema.js';
import { CommonResponse, CustomError, HttpStatusCodes } from '../../../utils/helpers/index.js';

jest.mock('../../../services/GrupoService.js');
jest.mock('../../../utils/validators/schemas/zod/GrupoSchema.js');
jest.mock('../../../utils/validators/schemas/zod/querys/GrupoQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
    CommonResponse: {
        created: jest.fn(),
        success: jest.fn(),
    },
    CustomError: class MockCustomError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    },
    HttpStatusCodes: {
        BAD_REQUEST: 400
    }
}));

describe('GrupoController', () => {
    let controller, req, res, serviceMock;

    beforeEach(() => {
        controller = new GrupoController();
        req = { 
            body: {}, 
            params: {}, 
            query: {}, 
            user: { _id: 'user123', nome: 'Usuario Teste' } 
        };
        res = {};
        serviceMock = GrupoService.mock.instances[0];
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve criar grupo com dados válidos', async () => {
            const grupoData = { nome: 'Novo Grupo', descricao: 'Descrição do grupo' };
            const grupoRetornado = { 
                _id: 'grupo1', 
                nome: 'Novo Grupo', 
                descricao: 'Descrição do grupo'
            };
            
            req.body = grupoData;
            GrupoSchema.parse.mockReturnValue(grupoData);
            serviceMock.criar.mockResolvedValue(grupoRetornado);

            await controller.criar(req, res);

            expect(GrupoSchema.parse).toHaveBeenCalledWith(req.body);
            expect(serviceMock.criar).toHaveBeenCalledWith(grupoData);
            expect(CommonResponse.created).toHaveBeenCalledWith(res, grupoRetornado);
        });

        it('deve retornar erro 400 para dados inválidos', async () => {
            req.body = { nome: '', descricao: '' };
            GrupoSchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'Dados inválidos' }; 
            });

            await expect(controller.criar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve propagar erro do service', async () => {
            const grupoData = { nome: 'Teste', descricao: 'Teste' };
            req.body = grupoData;
            
            GrupoSchema.parse.mockReturnValue(grupoData);
            serviceMock.criar.mockRejectedValue(new Error('Erro interno'));

            await expect(controller.criar(req, res)).rejects.toThrow('Erro interno');
        });
    });

    describe('listar', () => {
        it('deve listar grupos sem filtros', async () => {
            const grupos = [
                { _id: 'grupo1', nome: 'Grupo 1', descricao: 'Descrição 1' },
                { _id: 'grupo2', nome: 'Grupo 2', descricao: 'Descrição 2' }
            ];
            
            serviceMock.listar.mockResolvedValue(grupos);

            await controller.listar(req, res);

            expect(serviceMock.listar).toHaveBeenCalledWith(req);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, grupos);
        });

        it('deve listar grupo específico com ID válido', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            const grupo = { _id: grupoId, nome: 'Grupo Específico', descricao: 'Descrição específica' };
            
            req.params.id = grupoId;
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            serviceMock.listar.mockResolvedValue(grupo);

            await controller.listar(req, res);

            expect(GrupoIdSchema.parse).toHaveBeenCalledWith(grupoId);
            expect(serviceMock.listar).toHaveBeenCalledWith(req);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, grupo);
        });

        it('deve aplicar filtros de query válidos', async () => {
            const query = { nome: 'Admin', ativo: 'true', page: '1', limite: '10' };
            const grupos = [{ _id: 'grupo1', nome: 'Administradores' }];
            
            req.query = query;
            GrupoQuerySchema.parse.mockReturnValue(query);
            serviceMock.listar.mockResolvedValue(grupos);

            await controller.listar(req, res);

            expect(GrupoQuerySchema.parse).toHaveBeenCalledWith(req.query);
            expect(serviceMock.listar).toHaveBeenCalledWith(req);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, grupos);
        });

        it('deve retornar erro para ID inválido', async () => {
            req.params.id = 'id_invalido';
            GrupoIdSchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'ID inválido' }; 
            });

            await expect(controller.listar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve retornar erro para query inválida', async () => {
            req.query = { page: '-1' };
            GrupoQuerySchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'Page deve ser positiva' }; 
            });

            await expect(controller.listar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve listar sem validar query quando está vazia', async () => {
            req.query = {};
            const grupos = [{ _id: 'grupo1', nome: 'Grupo 1' }];
            
            serviceMock.listar.mockResolvedValue(grupos);

            await controller.listar(req, res);

            expect(GrupoQuerySchema.parse).not.toHaveBeenCalled();
            expect(serviceMock.listar).toHaveBeenCalledWith(req);
        });

        it('deve propagar erro do service', async () => {
            serviceMock.listar.mockRejectedValue(new Error('Erro do banco'));

            await expect(controller.listar(req, res)).rejects.toThrow('Erro do banco');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar grupo com dados válidos', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            const dadosAtualizacao = { nome: 'Grupo Atualizado', descricao: 'Nova descrição' };
            const grupoAtualizado = { _id: grupoId, ...dadosAtualizacao };
            
            req.params.id = grupoId;
            req.body = dadosAtualizacao;
            
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            GrupoUpdateSchema.parse.mockReturnValue(dadosAtualizacao);
            serviceMock.atualizar.mockResolvedValue(grupoAtualizado);

            await controller.atualizar(req, res);

            expect(GrupoIdSchema.parse).toHaveBeenCalledWith(grupoId);
            expect(GrupoUpdateSchema.parse).toHaveBeenCalledWith(req.body);
            expect(serviceMock.atualizar).toHaveBeenCalledWith(dadosAtualizacao, grupoId, req.user);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, grupoAtualizado);
        });

        it('deve retornar erro para ID inválido', async () => {
            req.params.id = 'id_invalido';
            req.body = { nome: 'Teste' };
            
            GrupoIdSchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'ID inválido' }; 
            });

            await expect(controller.atualizar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve retornar erro para dados inválidos', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            req.params.id = grupoId;
            req.body = { nome: '' };
            
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            GrupoUpdateSchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'Nome inválido' }; 
            });

            await expect(controller.atualizar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve propagar erro do service', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            const dadosAtualizacao = { nome: 'Teste' };
            
            req.params.id = grupoId;
            req.body = dadosAtualizacao;
            
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            GrupoUpdateSchema.parse.mockReturnValue(dadosAtualizacao);
            serviceMock.atualizar.mockRejectedValue(new Error('Grupo não encontrado'));

            await expect(controller.atualizar(req, res)).rejects.toThrow('Grupo não encontrado');
        });
    });

    describe('deletar', () => {
        it('deve deletar grupo com ID válido', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            const resultado = { deletedCount: 1 };
            
            req.params.id = grupoId;
            
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            serviceMock.deletar.mockResolvedValue(resultado);

            await controller.deletar(req, res);

            expect(GrupoIdSchema.parse).toHaveBeenCalledWith(grupoId);
            expect(serviceMock.deletar).toHaveBeenCalledWith(grupoId, req.user);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, resultado, 200, 'Grupo excluído com sucesso.');
        });

        it('deve retornar erro para ID inválido', async () => {
            req.params.id = 'id_invalido';
            
            GrupoIdSchema.parse.mockImplementation(() => { 
                throw { name: 'ZodError', message: 'ID inválido' }; 
            });

            await expect(controller.deletar(req, res)).rejects.toEqual(
                expect.objectContaining({ name: 'ZodError' })
            );
        });

        it('deve lançar erro se ID não fornecido', async () => {
            req.params = {};
            GrupoIdSchema.parse.mockReturnValue(null);

            await expect(controller.deletar(req, res)).rejects.toThrow('ID do grupo é obrigatório para deletar.');
        });

        it('deve propagar erro do service', async () => {
            const grupoId = '507f1f77bcf86cd799439011';
            
            req.params.id = grupoId;
            
            GrupoIdSchema.parse.mockReturnValue(grupoId);
            serviceMock.deletar.mockRejectedValue(new Error('Grupo não encontrado'));

            await expect(controller.deletar(req, res)).rejects.toThrow('Grupo não encontrado');
        });
    });
});
