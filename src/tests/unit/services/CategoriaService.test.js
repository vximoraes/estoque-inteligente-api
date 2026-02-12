import CategoriaService from '../../../services/CategoriaService.js';
import CategoriaRepository from '../../../repositories/CategoriaRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';

jest.mock('../../../repositories/CategoriaRepository.js');

const makeCategoria = (props = {}) => ({ _id: 'cat1', nome: 'Passivo', ...props });

describe('CategoriaService', () => {
    let service, repositoryMock;
    beforeEach(() => {
        CategoriaRepository.mockClear();
        repositoryMock = {
            criar: jest.fn(),
            listar: jest.fn(),
            atualizar: jest.fn(),
            buscarPorNome: jest.fn(),
            buscarPorId: jest.fn()
        };
        CategoriaRepository.mockImplementation(() => repositoryMock);
        service = new CategoriaService();
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve cadastrar categoria com nome único', async () => {
            const req = { user_id: 'user123' };
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.criar.mockResolvedValue(makeCategoria());
            const result = await service.criar({ nome: 'Passivo' }, req);
            expect(result).toHaveProperty('_id');
            expect(repositoryMock.criar).toHaveBeenCalledWith({ nome: 'Passivo', usuario: 'user123' });
        });
        it('deve lançar erro se nome já existir', async () => {
            repositoryMock.buscarPorNome.mockResolvedValue(makeCategoria());
            await expect(service.criar({ nome: 'Passivo' }))
                .rejects.toThrow(CustomError);
        });
    });

    describe('listar', () => {
        it('deve retornar todas as categorias', async () => {
            const cats = [makeCategoria(), makeCategoria({ _id: 'cat2', nome: 'Ativo' })];
            repositoryMock.listar.mockResolvedValue(cats);
            const result = await service.listar({});
            expect(result).toEqual(cats);
        });
        it('deve lançar erro inesperado do repository', async () => {
            repositoryMock.listar.mockRejectedValue(new Error('DB error'));
            await expect(service.listar({})).rejects.toThrow('DB error');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar nome de categoria existente', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.atualizar.mockResolvedValue(makeCategoria({ nome: 'Novo Nome' }));
            const result = await service.atualizar('cat1', { nome: 'Novo Nome' });
            expect(result.nome).toBe('Novo Nome');
        });
        it('deve lançar erro se categoria não existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.atualizar('catX', { nome: 'Qualquer' }))
                .rejects.toThrow(CustomError);
        });
        it('deve lançar erro se tentar atualizar para nome já existente', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            repositoryMock.buscarPorNome.mockResolvedValue(makeCategoria({ _id: 'cat2', nome: 'Duplicado' }));
            await expect(service.atualizar('cat1', { nome: 'Duplicado' }))
                .rejects.toThrow(CustomError);
        });
        it('deve lançar erro inesperado do repository', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.atualizar.mockRejectedValue(new Error('DB error'));
            await expect(service.atualizar('cat1', { nome: 'Novo' })).rejects.toThrow('DB error');
        });
    });

    describe('inativar', () => {
        it('deve inativar categoria existente sem componentes ativos', async () => {
            const ComponenteModel = require('../../../models/Componente.js').default;
            ComponenteModel.exists = jest.fn().mockResolvedValue(false);
            
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            repositoryMock.atualizar.mockResolvedValue(makeCategoria({ ativo: false }));
            const result = await service.inativar('cat1', {});
            expect(result).toHaveProperty('ativo', false);
        });
        it('deve lançar erro se categoria não existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.inativar('catX', {})).rejects.toThrow(CustomError);
        });
        it('deve lançar erro se categoria estiver vinculada a componentes ativos', async () => {
            const ComponenteModel = require('../../../models/Componente.js').default;
            ComponenteModel.exists = jest.fn().mockResolvedValue(true);
            
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            await expect(service.inativar('cat1', {})).rejects.toThrow('Categoria vinculada a componentes ativos');
        });
        it('deve lançar erro inesperado do repository', async () => {
            const ComponenteModel = require('../../../models/Componente.js').default;
            ComponenteModel.exists = jest.fn().mockResolvedValue(false);
            
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            repositoryMock.atualizar.mockRejectedValue(new Error('DB error'));
            await expect(service.inativar('cat1', {})).rejects.toThrow('DB error');
        });
    });

    describe('Métodos auxiliares', () => {
        it('validateNome lança erro se nome já existir', async () => {
            repositoryMock.buscarPorNome.mockResolvedValue(makeCategoria());
            await expect(service.validateNome('Passivo')).rejects.toThrow(CustomError);
        });
        it('validateNome não lança erro se nome for único', async () => {
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            await expect(service.validateNome('Unico')).resolves.toBeUndefined();
        });
        it('ensureCategoryExists lança erro se não existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.ensureCategoryExists('catX')).rejects.toThrow(CustomError);
        });
        it('ensureCategoryExists retorna categoria se existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(makeCategoria());
            await expect(service.ensureCategoryExists('cat1')).resolves.toHaveProperty('_id', 'cat1');
        });
    });
});
