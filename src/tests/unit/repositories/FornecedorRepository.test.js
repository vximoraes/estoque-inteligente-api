import FornecedorRepository from '../../../repositories/FornecedorRepository.js';
import FornecedorModel from '../../../models/Fornecedor.js';
import MovimentacaoModel from '../../../models/Movimentacao.js';
import { messages, CustomError } from '../../../utils/helpers/index.js';

jest.mock('../../../models/Fornecedor.js');
jest.mock('../../../models/Movimentacao.js');

const mockFornecedor = { 
    save: jest.fn(),
    toObject: jest.fn(),
};

const mockFornecedorDoc = { 
    toObject: jest.fn(),
};

const mockPaginateResult = {
    docs: [mockFornecedorDoc],
};

FornecedorModel.mockImplementation(() => mockFornecedor);
FornecedorModel.paginate = jest.fn();
FornecedorModel.findById = jest.fn();
FornecedorModel.findByIdAndUpdate = jest.fn();
FornecedorModel.findByIdAndDelete = jest.fn();
FornecedorModel.findOne = jest.fn();

MovimentacaoModel.exists = jest.fn();

describe('FornecedorRepository', () => {
    let repository;
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FornecedorRepository({ fornecedorModel: FornecedorModel });
    });

    describe('criar', () => {
        it('deve criar e salvar um fornecedor', async () => {
            mockFornecedor.save.mockResolvedValue('saved');
            const result = await repository.criar({ nome: 'Fornecedor X' });
            expect(result).toBe('saved');
            expect(mockFornecedor.save).toHaveBeenCalled();
        });
    });

    describe('listar', () => {
        it('deve retornar fornecedor por id', async () => {
            const req = { params: { id: '123' }, user_id: 'user1' };
            const data = { toObject: () => ({ nome: 'Fornecedor Y' }) };
            FornecedorModel.findOne = jest.fn().mockResolvedValue(data);
            const result = await repository.listar(req);
            expect(result).toEqual({ nome: 'Fornecedor Y' });
        });

        it('deve lançar erro se fornecedor não encontrado por id', async () => {
            const req = { params: { id: 'notfound' }, user_id: 'user1' };
            FornecedorModel.findOne = jest.fn().mockResolvedValue(null);
            await expect(repository.listar(req)).rejects.toThrow(CustomError);
        });

        it('deve listar fornecedores paginados', async () => {
            const req = { params: {}, query: { page: 1, limite: 10, nome: 'abc' }, user_id: 'user1' };
            FornecedorModel.paginate.mockResolvedValue({ docs: [{ toObject: () => ({ nome: 'Fornecedor Z' }) }] });
            const result = await repository.listar(req);
            expect(result.docs[0].nome).toBe('Fornecedor Z');
        });

        it('deve lançar erro se o filterBuilder não tiver método build', async () => {
            jest.resetModules();
            jest.doMock('../../../repositories/filters/FornecedorFilterBuilder.js', () => {
                return jest.fn().mockImplementation(() => ({
                    comNome: jest.fn().mockReturnThis(),
                }));
            });
            const FornecedorRepositoryWithBrokenBuilder = (await import('../../../repositories/FornecedorRepository.js')).default;
            const repositoryWithBrokenBuilder = new FornecedorRepositoryWithBrokenBuilder({ fornecedorModel: FornecedorModel });
            const req = { params: {}, query: { page: 1, limite: 10, nome: 'abc' }, user_id: 'user1' };
            
            try {
                await repositoryWithBrokenBuilder.listar(req);
                fail('Deveria ter lançado um erro');
            } catch (error) {
                expect(['CustomError', 'TypeError']).toContain(error.constructor.name);
                if (error.constructor.name === 'CustomError') {
                    expect(error.message).toContain('Erro interno no servidor ao processar Fornecedor');
                }
            }
            
            jest.dontMock('../../../repositories/filters/FornecedorFilterBuilder.js');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar fornecedor existente', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ nome: 'Atualizado' })
            });
            const result = await repository.atualizar('id', { nome: 'Atualizado' }, req);
            expect(result.nome).toBe('Atualizado');
        });
        it('deve lançar erro se fornecedor não encontrado', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });
            await expect(repository.atualizar('id', {}, req)).rejects.toThrow(CustomError);
        });
    });

    describe('buscarPorNome', () => {
        it('deve buscar fornecedor por nome', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOne.mockResolvedValue({ nome: 'Fornecedor A' });
            const result = await repository.buscarPorNome('Fornecedor A', null, req);
            expect(result.nome).toBe('Fornecedor A');
        });
        it('deve buscar fornecedor por nome ignorando id', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOne.mockResolvedValue({ nome: 'Fornecedor B' });
            const result = await repository.buscarPorNome('Fornecedor B', 'idIgnorado', req);
            expect(result.nome).toBe('Fornecedor B');
        });
    });

    describe('buscarPorId', () => {
        it('deve retornar fornecedor por id', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOne = jest.fn().mockResolvedValue({ nome: 'Fornecedor C' });
            const result = await repository.buscarPorId('id', false, req);
            expect(result.nome).toBe('Fornecedor C');
        });
        it('deve lançar erro se fornecedor não encontrado', async () => {
            const req = { user_id: 'user1' };
            FornecedorModel.findOne = jest.fn().mockResolvedValue(null);
            await expect(repository.buscarPorId('id', false, req)).rejects.toThrow(CustomError);
        });
    });
});
