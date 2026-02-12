import LocalizacaoRepository from '../../../repositories/LocalizacaoRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';

jest.mock('../../../models/Localizacao.js');
jest.mock('../../../models/Componente.js');

import LocalizacaoModel from '../../../models/Localizacao.js';
import ComponenteModel from '../../../models/Componente.js';

describe('LocalizacaoRepository', () => {
    let repository;
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new LocalizacaoRepository({ localizacaoModel: LocalizacaoModel });
    });

    describe('criar', () => {
        it('deve criar localização com nome único', async () => {
            const fakeLoc = { _id: 'loc1', nome: 'Estoque', save: jest.fn().mockResolvedValue({ _id: 'loc1', nome: 'Estoque' }) };
            LocalizacaoModel.mockImplementation(() => fakeLoc);
            const result = await repository.criar({ nome: 'Estoque' });
            expect(result).toEqual({ _id: 'loc1', nome: 'Estoque' });
        });
        it('deve lançar erro se o save falhar', async () => {
            LocalizacaoModel.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error('DB error')) }));
            await expect(repository.criar({ nome: 'Estoque' })).rejects.toThrow('DB error');
        });
    });

    describe('listar', () => {
        it('deve retornar localização por id', async () => {
            const fakeLoc = { _id: 'loc1', nome: 'Estoque', toObject: () => ({ _id: 'loc1', nome: 'Estoque' }) };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue(fakeLoc);
            const req = { params: { id: 'loc1' }, query: {}, user_id: 'user1' };
            const result = await repository.listar(req);
            expect(result).toEqual({ _id: 'loc1', nome: 'Estoque' });
        });
        it('deve lançar erro 404 se localização não encontrada por id', async () => {
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue(null);
            const req = { params: { id: 'notfound' }, query: {}, user_id: 'user1' };
            await expect(repository.listar(req)).rejects.toThrow(CustomError);
        });
        it('deve listar localizações com filtro de nome', async () => {
            const paginated = { docs: [{ _id: 'loc1', nome: 'Estoque', toObject: () => ({ _id: 'loc1', nome: 'Estoque' }) }], total: 1, page: 1, limit: 10 };
            LocalizacaoModel.paginate = jest.fn().mockResolvedValue(paginated);
            const req = { params: {}, query: { nome: 'Estoque', page: 1, limite: 10 } };
            const result = await repository.listar(req);
            expect(result.docs.length).toBe(1);
            expect(LocalizacaoModel.paginate).toHaveBeenCalled();
        });
        it('deve lançar erro 500 se filterBuilder.build não for função', async () => {
            jest.resetModules();
            jest.doMock('../../../repositories/filters/LocalizacaoFilterBuilder.js', () => {
                return {
                    __esModule: true,
                    default: jest.fn(() => ({
                        comNome: jest.fn().mockReturnThis(),
                        build: undefined
                    }))
                }
            });
            const { default: LocalizacaoRepositoryWithMocks } = await import('../../../repositories/LocalizacaoRepository.js');
            const repo = new LocalizacaoRepositoryWithMocks({ localizacaoModel: LocalizacaoModel });
            const req = { params: {}, query: {} };
            try {
                await repo.listar(req);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.statusCode).toBe(500);
                expect(error.errorType).toBe('internalServerError');
            }
        });
    });

    describe('atualizar', () => {
        it('deve atualizar localização existente', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOneAndUpdate = jest.fn(() => ({ lean: () => Promise.resolve({ _id: 'loc1', nome: 'Novo Nome' }) }));
            const result = await repository.atualizar('loc1', { nome: 'Novo Nome' }, req);
            expect(result.nome).toBe('Novo Nome');
        });
        it('deve lançar erro 404 se localização não encontrada', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOneAndUpdate = jest.fn(() => ({ lean: () => Promise.resolve(null) }));
            await expect(repository.atualizar('notfound', { nome: 'X' }, req)).rejects.toMatchObject({ statusCode: 404, errorType: 'resourceNotFound' });
        });
        it('deve lançar erro se o banco lançar exceção', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOneAndUpdate = jest.fn(() => ({ lean: () => Promise.reject(new Error('DB error')) }));
            await expect(repository.atualizar('loc1', { nome: 'X' }, req)).rejects.toThrow('DB error');
        });
    });

    describe('buscarPorNome', () => {
        it('deve buscar localização por nome', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue({ _id: 'loc1', nome: 'Estoque' });
            const result = await repository.buscarPorNome('Estoque', null, req);
            expect(result).toEqual({ _id: 'loc1', nome: 'Estoque' });
        });
        it('deve buscar localização por nome ignorando id', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue({ _id: 'loc2', nome: 'Estoque' });
            const result = await repository.buscarPorNome('Estoque', 'ignoreid', req);
            expect(result).toEqual({ _id: 'loc2', nome: 'Estoque' });
        });
        it('deve retornar null se nome não encontrado', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue(null);
            const result = await repository.buscarPorNome('Inexistente', null, req);
            expect(result).toBeNull();
        });
        it('deve lançar erro se o banco lançar exceção', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockRejectedValue(new Error('DB error'));
            await expect(repository.buscarPorNome('Estoque', null, req)).rejects.toThrow('DB error');
        });
    });

    describe('buscarPorId', () => {
        it('deve buscar localização por id', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue({ _id: 'loc1', nome: 'Estoque' });
            const result = await repository.buscarPorId('loc1', false, req);
            expect(result).toEqual({ _id: 'loc1', nome: 'Estoque' });
        });
        it('deve lançar erro 404 se localização não encontrada', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockResolvedValue(null);
            await expect(repository.buscarPorId('notfound', false, req)).rejects.toThrow(CustomError);
        });
        it('deve lançar erro se o banco lançar exceção', async () => {
            const req = { user_id: 'user1' };
            LocalizacaoModel.findOne = jest.fn().mockRejectedValue(new Error('DB error'));
            await expect(repository.buscarPorId('loc1', false, req)).rejects.toThrow('DB error');
        });
    });
});