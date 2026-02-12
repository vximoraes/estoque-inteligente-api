import CategoriaRepository from '../../../repositories/CategoriaRepository.js';
import CategoriaModel from '../../../models/Categoria.js';
import ComponenteModel from '../../../models/Componente.js';
import CategoriaFilterBuilder from '../../../repositories/filters/CategoriaFilterBuilder.js';
import { CustomError, messages } from '../../../utils/helpers/index.js';

jest.mock('../../../models/Categoria.js');
jest.mock('../../../models/Componente.js');
jest.mock('../../../repositories/filters/CategoriaFilterBuilder.js');

const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindOne = jest.fn();
const mockPaginate = jest.fn();
const mockSave = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    CategoriaModel.mockImplementation(() => ({
        save: mockSave,
    }));
    CategoriaModel.findById = mockFindById;
    CategoriaModel.findByIdAndUpdate = mockFindByIdAndUpdate;
    CategoriaModel.findByIdAndDelete = mockFindByIdAndDelete;
    CategoriaModel.findOne = mockFindOne;
    CategoriaModel.paginate = mockPaginate;
    ComponenteModel.exists = jest.fn();
});

describe('CategoriaRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new CategoriaRepository({ categoriaModel: CategoriaModel });
    });

    describe('criar', () => {
        it('deve criar e retornar categoria', async () => {
            const dados = { nome: 'Cat1' };
            const categoriaSalva = { _id: 'id1', nome: 'Cat1' };
            mockSave.mockResolvedValueOnce(categoriaSalva);
            const result = await repository.criar(dados);
            expect(result).toEqual(categoriaSalva);
        });
    });

    describe('listar', () => {
        it('deve retornar categoria por id', async () => {
            const req = { params: { id: 'id1' }, query: {}, user_id: 'user1' };
            CategoriaModel.findOne = jest.fn().mockResolvedValueOnce({ toObject: () => ({ nome: 'Cat1', _id: 'id1' }) });
            const result = await repository.listar(req);
            expect(result).toEqual({ nome: 'Cat1', _id: 'id1' });
        });

        it('deve lançar erro 404 se categoria não encontrada por id', async () => {
            const req = { params: { id: 'id1' }, query: {}, user_id: 'user1' };
            CategoriaModel.findOne = jest.fn().mockResolvedValueOnce(null);
            await expect(repository.listar(req)).rejects.toThrow(CustomError);
        });

        it('deve listar categorias com filtros', async () => {
            const req = { params: {}, query: { nome: 'Cat1', page: 1, limite: 10 } };
            const mockBuild = jest.fn(() => ({}));
            CategoriaFilterBuilder.mockImplementation(() => ({
                comNome: () => ({ build: mockBuild }),
                build: mockBuild
            }));
            mockPaginate.mockResolvedValueOnce({ docs: [{ toObject: () => ({ nome: 'Cat1' }) }], total: 1 });
            const result = await repository.listar(req);
            expect(result.docs[0]).toEqual({ nome: 'Cat1' });
        });

        it('deve lançar erro 500 se build não for função', async () => {
            const req = { params: {}, query: {} };
            CategoriaFilterBuilder.mockImplementation(() => ({ comNome: () => ({}), build: undefined }));
            await expect(repository.listar(req)).rejects.toThrow(CustomError);
        });
    });

    describe('atualizar', () => {
        it('deve atualizar e retornar categoria', async () => {
            const req = { user_id: 'user1' };
            CategoriaModel.findOneAndUpdate = jest.fn().mockReturnValueOnce({
                lean: () => ({ nome: 'Cat1', _id: 'id1' })
            });
            const result = await repository.atualizar('id1', { nome: 'Novo' }, req);
            expect(result).toEqual({ nome: 'Cat1', _id: 'id1' });
        });
        it('deve lançar erro 404 se categoria não encontrada', async () => {
            const req = { user_id: 'user1' };
            CategoriaModel.findOneAndUpdate = jest.fn().mockReturnValueOnce({
                lean: () => null
            });
            await expect(repository.atualizar('id1', { nome: 'Novo' }, req)).rejects.toThrow(CustomError);
        });
    });

    describe('buscarPorNome', () => {
        it('deve retornar categoria por nome', async () => {
            const req = { user_id: 'user1' };
            mockFindOne.mockResolvedValueOnce({ nome: 'Cat1', _id: 'id1' });
            const result = await repository.buscarPorNome('Cat1', null, req);
            expect(result).toEqual({ nome: 'Cat1', _id: 'id1' });
        });
        it('deve retornar null se não encontrar categoria', async () => {
            const req = { user_id: 'user1' };
            mockFindOne.mockResolvedValueOnce(null);
            const result = await repository.buscarPorNome('Cat1', null, req);
            expect(result).toBeNull();
        });
    });

    describe('buscarPorId', () => {
        it('deve retornar categoria por id', async () => {
            const req = { user_id: 'user1' };
            CategoriaModel.findOne = jest.fn().mockResolvedValueOnce({ nome: 'Cat1', _id: 'id1' });
            const result = await repository.buscarPorId('id1', false, req);
            expect(result).toEqual({ nome: 'Cat1', _id: 'id1' });
        });
        it('deve lançar erro 404 se não encontrar categoria', async () => {
            const req = { user_id: 'user1' };
            CategoriaModel.findOne = jest.fn().mockResolvedValueOnce(null);
            await expect(repository.buscarPorId('id1', false, req)).rejects.toThrow(CustomError);
        });
    });
});
