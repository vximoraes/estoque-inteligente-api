import LocalizacaoController from '../../../controllers/LocalizacaoController.js';
import LocalizacaoService from '../../../services/LocalizacaoService.js';
import { LocalizacaoSchema, LocalizacaoUpdateSchema } from '../../../utils/validators/schemas/zod/LocalizacaoSchema.js';
import { LocalizacaoQuerySchema, LocalizacaoIdSchema } from '../../../utils/validators/schemas/zod/querys/LocalizacaoQuerySchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../../../services/LocalizacaoService.js');
jest.mock('../../../utils/validators/schemas/zod/LocalizacaoSchema.js');
jest.mock('../../../utils/validators/schemas/zod/querys/LocalizacaoQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
    CommonResponse: {
        created: jest.fn(),
        success: jest.fn(),
    }
}));

describe('LocalizacaoController', () => {
    let controller, req, res, serviceMock;

    beforeEach(() => {
        controller = new LocalizacaoController();
        req = { body: {}, params: {}, query: {} };
        res = {};
        serviceMock = LocalizacaoService.mock.instances[0];
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve criar localização com dados válidos', async () => {
            const localizacao = { nome: 'Prateleira A', toObject: () => ({ nome: 'Prateleira A', _id: '1' }) };
            LocalizacaoSchema.parse.mockReturnValue({ nome: 'Prateleira A' });
            serviceMock.criar.mockResolvedValue(localizacao);

            await controller.criar(req, res);

            expect(LocalizacaoSchema.parse).toHaveBeenCalledWith(req.body);
            expect(serviceMock.criar).toHaveBeenCalledWith({ nome: 'Prateleira A' }, req);
            expect(CommonResponse.created).toHaveBeenCalledWith(res, { nome: 'Prateleira A', _id: '1' });
        });

        it('deve retornar erro 400 para dados inválidos', async () => {
            LocalizacaoSchema.parse.mockImplementation(() => { throw { name: 'ZodError' }; });
            await expect(controller.criar(req, res)).rejects.toEqual(expect.objectContaining({ name: 'ZodError' }));
        });

        it('deve retornar erro 409 para nome já existente', async () => {
            LocalizacaoSchema.parse.mockReturnValue({ nome: 'Prateleira A' });
            serviceMock.criar.mockRejectedValue({ status: 409 });
            await expect(controller.criar(req, res)).rejects.toEqual(expect.objectContaining({ status: 409 }));
        });

        it('deve retornar erro 500 para falha inesperada', async () => {
            LocalizacaoSchema.parse.mockReturnValue({ nome: 'Prateleira A' });
            serviceMock.criar.mockRejectedValue({ status: 500 });
            await expect(controller.criar(req, res)).rejects.toEqual(expect.objectContaining({ status: 500 }));
        });
    });

    describe('listar', () => {
        it('deve listar localizações sem filtros', async () => {
            serviceMock.listar.mockResolvedValue([{ nome: 'Prateleira A' }]);
            await controller.listar(req, res);
            expect(serviceMock.listar).toHaveBeenCalledWith(req);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, [{ nome: 'Prateleira A' }]);
        });

        it('deve validar id se presente', async () => {
            req.params = { id: '123' };
            LocalizacaoIdSchema.parse.mockReturnValue('123');
            serviceMock.listar.mockResolvedValue([{ nome: 'Prateleira A' }]);
            await controller.listar(req, res);
            expect(LocalizacaoIdSchema.parse).toHaveBeenCalledWith('123');
        });

        it('deve validar query se presente', async () => {
            req.query = { nome: 'Teste' };
            LocalizacaoQuerySchema.parseAsync.mockResolvedValue(req.query);
            serviceMock.listar.mockResolvedValue([{ nome: 'Prateleira A' }]);
            await controller.listar(req, res);
            expect(LocalizacaoQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
        });

        it('deve retornar erro 400 para filtro inválido', async () => {
            req.query = { nome: 123 };
            LocalizacaoQuerySchema.parseAsync.mockRejectedValue({ name: 'ZodError' });
            await expect(controller.listar(req, res)).rejects.toEqual(expect.objectContaining({ name: 'ZodError' }));
        });

        it('deve retornar erro 404 quando localização não é encontrada', async () => {
            req.params = { id: '999' };
            LocalizacaoIdSchema.parse.mockReturnValue('999');
            serviceMock.listar.mockRejectedValue({ status: 404 });
            await expect(controller.listar(req, res)).rejects.toEqual(expect.objectContaining({ status: 404 }));
        });

        it('deve retornar erro 500 para falha inesperada', async () => {
            serviceMock.listar.mockRejectedValue({ status: 500 });
            await expect(controller.listar(req, res)).rejects.toEqual(expect.objectContaining({ status: 500 }));
        });
    });

    describe('atualizar', () => {
        it('deve atualizar localização com dados válidos', async () => {
            req.params = { id: '1' };
            req.body = { nome: 'Prateleira B' };
            LocalizacaoIdSchema.parse.mockReturnValue('1');
            LocalizacaoUpdateSchema.parse.mockReturnValue({ nome: 'Prateleira B' });
            serviceMock.atualizar.mockResolvedValue({ nome: 'Prateleira B' });

            await controller.atualizar(req, res);

            expect(LocalizacaoIdSchema.parse).toHaveBeenCalledWith('1');
            expect(LocalizacaoUpdateSchema.parse).toHaveBeenCalledWith(req.body);
            expect(serviceMock.atualizar).toHaveBeenCalledWith('1', { nome: 'Prateleira B' }, req);
            expect(CommonResponse.success).toHaveBeenCalledWith(
                res,
                { nome: 'Prateleira B' },
                200,
                'Localização atualizada com sucesso.'
            );
        });

        it('deve retornar erro 400 para dados inválidos', async () => {
            req.params = { id: '1' };
            LocalizacaoIdSchema.parse.mockReturnValue('1');
            LocalizacaoUpdateSchema.parse.mockImplementation(() => { throw { name: 'ZodError' }; });
            await expect(controller.atualizar(req, res)).rejects.toEqual(expect.objectContaining({ name: 'ZodError' }));
        });

        it('deve retornar erro 404 para localização inexistente', async () => {
            req.params = { id: '999' };
            LocalizacaoIdSchema.parse.mockReturnValue('999');
            LocalizacaoUpdateSchema.parse.mockReturnValue({ nome: 'Prateleira B' });
            serviceMock.atualizar.mockRejectedValue({ status: 404 });
            await expect(controller.atualizar(req, res)).rejects.toEqual(expect.objectContaining({ status: 404 }));
        });

        it('deve retornar erro 409 para nome já existente', async () => {
            req.params = { id: '1' };
            LocalizacaoIdSchema.parse.mockReturnValue('1');
            LocalizacaoUpdateSchema.parse.mockReturnValue({ nome: 'Prateleira Existente' });
            serviceMock.atualizar.mockRejectedValue({ status: 409 });
            await expect(controller.atualizar(req, res)).rejects.toEqual(expect.objectContaining({ status: 409 }));
        });

        it('deve retornar erro 500 para falha inesperada', async () => {
            req.params = { id: '1' };
            LocalizacaoIdSchema.parse.mockReturnValue('1');
            LocalizacaoUpdateSchema.parse.mockReturnValue({ nome: 'Prateleira B' });
            serviceMock.atualizar.mockRejectedValue({ status: 500 });
            await expect(controller.atualizar(req, res)).rejects.toEqual(expect.objectContaining({ status: 500 }));
        });
    });

    describe('inativar', () => {
        it('deve inativar localização existente', async () => {
            req.params = { id: '1' };
            LocalizacaoIdSchema.parse.mockReturnValue('1');
            serviceMock.inativar.mockResolvedValue({ nome: 'Prateleira A', ativo: false });

            await controller.inativar(req, res);

            expect(LocalizacaoIdSchema.parse).toHaveBeenCalledWith('1');
            expect(serviceMock.inativar).toHaveBeenCalledWith('1', req);
            expect(CommonResponse.success).toHaveBeenCalledWith(res, { nome: 'Prateleira A', ativo: false }, 200, 'Localização inativada com sucesso.');
        });

        it('deve retornar erro 404 ao tentar inativar localização inexistente', async () => {
            req.params = { id: '999' };
            LocalizacaoIdSchema.parse.mockReturnValue('999');
            serviceMock.inativar.mockRejectedValue({ status: 404 });
            await expect(controller.inativar(req, res)).rejects.toEqual(expect.objectContaining({ status: 404 }));
        });

        it('deve validar id ao inativar', async () => {
            req.params = { id: 'invalid-id' };
            LocalizacaoIdSchema.parse.mockImplementation(() => { throw { name: 'ZodError' }; });
            await expect(controller.inativar(req, res)).rejects.toEqual(expect.objectContaining({ name: 'ZodError' }));
        });
    });
});